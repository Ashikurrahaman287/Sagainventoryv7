/**
 * Saga Inventory — Telegram Bot (server/telegram.ts)
 *
 * 100% optional. If TELEGRAM_BOT_TOKEN is absent the function returns
 * immediately and nothing breaks.
 *
 * Auth flow:
 *   /unlock <password>  → grants session access (stored in memory per chat-id)
 *   /lock               → revokes access
 *
 * All bot state is in-memory. A server restart resets sessions, so users
 * must /unlock again — this is intentional for security.
 */

import { Telegraf, Markup, Context } from "telegraf";
import { message } from "telegraf/filters";
import { storage } from "./storage";
import { sendDeliveryEmails } from "./email";
import { sendSms, orderDeliveredMessage, paymentReceivedMessage } from "./sms";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  "৳" +
  Number(v).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Escape special chars for Telegram MarkdownV2 */
function esc(text: string | number | null | undefined): string {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

// ─── in-memory authorised chat IDs ───────────────────────────────────────────

const authorised = new Set<number>();

function isAuth(ctx: Context): boolean {
  const id = ctx.chat?.id;
  return id !== undefined && authorised.has(id);
}

function requireAuthMiddleware(
  ctx: Context,
  next: () => Promise<void>
): Promise<void> {
  if (isAuth(ctx)) return next();
  return ctx
    .reply(
      "🔒 *Access denied\\.*\n\nType `/unlock YOUR_PASSWORD` to gain access\\.",
      { parse_mode: "MarkdownV2" }
    )
    .then(() => undefined);
}

// ─── delivery confirmation logic (shared with web app) ───────────────────────

async function confirmDelivery(
  saleId: string,
  paymentReceived: boolean
): Promise<{ ok: boolean; message: string }> {
  const saleDetail = await storage.getSaleWithItems(saleId);
  if (!saleDetail) return { ok: false, message: "Order not found." };

  const { customerName, customerEmail, customerPhone, sale } = saleDetail;

  const updated = await storage.markSaleDelivered(saleId, paymentReceived);
  if (!updated) return { ok: false, message: "Failed to update order." };

  // SMS
  try {
    if (customerPhone) {
      const smsMsg = orderDeliveredMessage({
        customerName,
        receiptNumber: sale.receiptNumber,
      });
      await sendSms(customerPhone, smsMsg);

      if (paymentReceived) {
        const payMsg = paymentReceivedMessage({
          customerName,
          receiptNumber: sale.receiptNumber,
          total: String(sale.total),
        });
        await sendSms(customerPhone, payMsg);
      }
    }
  } catch (_) {
    // SMS failure must never crash the bot
  }

  // Email
  if (paymentReceived && customerEmail) {
    try {
      await sendDeliveryEmails({
        customerName,
        customerEmail,
        receiptNumber: sale.receiptNumber,
        total: String(sale.total),
      });
    } catch (_) {
      // email failure must never crash the bot
    }
  }

  return {
    ok: true,
    message: paymentReceived
      ? `✅ Marked delivered \\+ payment confirmed\\. SMS & email sent to *${esc(customerName)}*\\.`
      : `✅ Marked as delivered \\(no payment\\)\\. SMS sent to *${esc(customerName)}*\\.`,
  };
}

// ─── bot factory ─────────────────────────────────────────────────────────────

export function startTelegramBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN not set — bot disabled.");
    return;
  }

  const adminPassword = process.env.TELEGRAM_ADMIN_PASSWORD?.trim();
  if (!adminPassword) {
    console.warn(
      "[telegram] TELEGRAM_ADMIN_PASSWORD not set — bot will start but /unlock will never succeed."
    );
  }

  const bot = new Telegraf(token);

  // ── /start ────────────────────────────────────────────────────────────────
  bot.start((ctx) =>
    ctx.replyWithMarkdownV2(
      `👋 *Welcome to Saga Inventory Bot\\!*\n\n` +
        `This bot lets you manage your inventory from Telegram\\.\n\n` +
        `🔒 You must unlock first:\n` +
        `\`/unlock YOUR\\_PASSWORD\`\n\n` +
        `Once unlocked, type /help to see available commands\\.`
    )
  );

  // ── /unlock ───────────────────────────────────────────────────────────────
  bot.command("unlock", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const provided = parts[1];

    if (!provided) {
      return ctx.reply("Usage: /unlock YOUR_PASSWORD");
    }
    if (!adminPassword || provided !== adminPassword) {
      return ctx.replyWithMarkdownV2(
        "❌ *Wrong password\\.*  Try again or contact the admin\\."
      );
    }

    authorised.add(ctx.chat.id);
    return ctx.replyWithMarkdownV2(
      "✅ *Unlocked\\!* You now have full access\\.\n\nType /help to see all commands\\."
    );
  });

  // ── /lock ─────────────────────────────────────────────────────────────────
  bot.command("lock", async (ctx) => {
    authorised.delete(ctx.chat?.id ?? 0);
    return ctx.reply("🔒 Session locked. Type /unlock PASSWORD to re-enter.");
  });

  // ── guard all remaining commands ─────────────────────────────────────────
  bot.use(requireAuthMiddleware);

  // ── /help ─────────────────────────────────────────────────────────────────
  bot.command("help", (ctx) =>
    ctx.replyWithMarkdownV2(
      `📋 *Saga Inventory — Commands*\n\n` +
        `/dashboard \\— Today's stats overview\n` +
        `/pending \\— Pending deliveries with action buttons\n` +
        `/deliver RCP\\-xxx \\— Confirm a specific delivery\n` +
        `/lowstock \\— Products running low\n` +
        `/products \\[query\\] \\— Search or list all products\n` +
        `/sales \\— Today's sales summary\n` +
        `/report \\— Overall sales report\n` +
        `/lock \\— Lock this session\n\n` +
        `💡 *Inline mode:* Type \`@YourBotName product name\` anywhere to search products\\.`
    )
  );

  // ── /dashboard ────────────────────────────────────────────────────────────
  bot.command("dashboard", async (ctx) => {
    try {
      const stats = await storage.getDashboardStats();
      await ctx.replyWithMarkdownV2(
        `📊 *Dashboard — Today*\n\n` +
          `🛍️  Products in stock:  *${esc(stats.totalProducts)}*\n` +
          `💰  Today's sales:       *${esc(fmt(stats.todaysSales))}*\n` +
          `📈  Today's profit:      *${esc(fmt(stats.todaysProfit))}*\n` +
          `⚠️  Low stock items:     *${esc(stats.lowStockCount)}*`
      );
    } catch (e: any) {
      await ctx.reply(`❌ Failed to load dashboard: ${e.message}`);
    }
  });

  // ── /pending (alias /deliveries) ─────────────────────────────────────────
  async function sendPendingDeliveries(ctx: Context) {
    try {
      const orders = await storage.getDeliveryOrders();
      if (orders.length === 0) {
        return ctx.reply("🎉 No pending deliveries — all caught up!");
      }

      await ctx.reply(
        `🚚 *${esc(orders.length)} pending deliver${orders.length === 1 ? "y" : "ies"}*`,
        { parse_mode: "MarkdownV2" }
      );

      // Send each order as its own message with inline buttons (max 8 to avoid spam)
      const slice = orders.slice(0, 8);
      for (const order of slice) {
        const due =
          order.amountPaid != null
            ? Math.max(0, Number(order.total) - Number(order.amountPaid))
            : 0;

        const lines: string[] = [
          `📦 *${esc(order.receiptNumber)}*`,
          `👤 ${esc(order.customerName)}`,
          `💵 Total: ${esc(fmt(order.total))}`,
        ];
        if (due > 0) lines.push(`🔴 Due: ${esc(fmt(due))}`);
        if ((order as any).deliveryDate)
          lines.push(`📅 ${esc((order as any).deliveryDate)}${(order as any).deliveryTime ? " " + esc((order as any).deliveryTime) : ""}`);
        if ((order as any).deliveryAddress)
          lines.push(`📍 ${esc((order as any).deliveryAddress)}`);

        await ctx.replyWithMarkdownV2(
          lines.join("\n"),
          Markup.inlineKeyboard([
            Markup.button.callback(
              "✅ Delivered (Paid)",
              `deliver_paid:${order.id}`
            ),
            Markup.button.callback(
              "📦 Delivered (No Pay)",
              `deliver_nopay:${order.id}`
            ),
          ])
        );
      }

      if (orders.length > 8) {
        await ctx.reply(
          `…and ${orders.length - 8} more. Use /deliver RCP\\-xxx for specific orders\\.`,
          { parse_mode: "MarkdownV2" }
        );
      }
    } catch (e: any) {
      await ctx.reply(`❌ Failed to load deliveries: ${e.message}`);
    }
  }

  bot.command("pending", sendPendingDeliveries);
  bot.command("deliveries", sendPendingDeliveries);

  // ── /deliver RCP-xxx ──────────────────────────────────────────────────────
  bot.command("deliver", async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/);
    const receipt = parts[1]?.toUpperCase();
    if (!receipt) {
      return ctx.reply(
        "Usage: /deliver RCP-XXXX\n\nOr use /pending to see all pending deliveries with buttons."
      );
    }

    try {
      const orders = await storage.getDeliveryOrders();
      const order = orders.find(
        (o) => o.receiptNumber.toUpperCase() === receipt
      );

      if (!order) {
        return ctx.replyWithMarkdownV2(
          `❌ Order *${esc(receipt)}* not found in the delivery queue\\.`
        );
      }

      const due =
        order.amountPaid != null
          ? Math.max(0, Number(order.total) - Number(order.amountPaid))
          : 0;

      const lines = [
        `📦 *${esc(order.receiptNumber)}*`,
        `👤 ${esc(order.customerName)}`,
        `💵 Total: ${esc(fmt(order.total))}`,
      ];
      if (due > 0) lines.push(`🔴 Outstanding: ${esc(fmt(due))}`);

      await ctx.replyWithMarkdownV2(
        lines.join("\n") + "\n\nConfirm delivery:",
        Markup.inlineKeyboard([
          Markup.button.callback(
            "✅ Delivered (Paid)",
            `deliver_paid:${order.id}`
          ),
          Markup.button.callback(
            "📦 Delivered (No Pay)",
            `deliver_nopay:${order.id}`
          ),
        ])
      );
    } catch (e: any) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  });

  // ── callback: delivery buttons ────────────────────────────────────────────
  bot.action(/^deliver_(paid|nopay):(.+)$/, async (ctx) => {
    if (!isAuth(ctx)) {
      await ctx.answerCbQuery("🔒 Session expired. Please /unlock again.");
      return;
    }

    const match = ctx.match;
    const paymentReceived = match[1] === "paid";
    const saleId = match[2];

    await ctx.answerCbQuery("Processing…");
    await ctx.editMessageReplyMarkup(undefined); // remove buttons to prevent double-tap

    const result = await confirmDelivery(saleId, paymentReceived);

    if (result.ok) {
      await ctx.replyWithMarkdownV2(result.message);
    } else {
      await ctx.reply(`❌ ${result.message}`);
    }
  });

  // ── /lowstock ─────────────────────────────────────────────────────────────
  bot.command("lowstock", async (ctx) => {
    try {
      const items = await storage.getLowStockProducts(10);
      if (items.length === 0) {
        return ctx.reply("✅ All products are well-stocked!");
      }

      const rows = items
        .map(
          (p) =>
            `• *${esc(p.name)}* \\(${esc(p.stockCode)}\\) — qty: *${esc(p.quantity)}*`
        )
        .join("\n");

      await ctx.replyWithMarkdownV2(
        `⚠️ *${esc(items.length)} low\\-stock item${items.length === 1 ? "" : "s"}*\n\n${rows}`
      );
    } catch (e: any) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  });

  // ── /products [query] ─────────────────────────────────────────────────────
  bot.command("products", async (ctx) => {
    const query = ctx.message.text.replace(/^\/products\s*/i, "").trim();

    try {
      const products = query
        ? await storage.searchProducts(query)
        : await storage.getProducts();

      if (products.length === 0) {
        return ctx.reply(query ? `No products found for "${query}".` : "No products in inventory.");
      }

      const slice = products.slice(0, 20);
      const rows = slice
        .map(
          (p) =>
            `• *${esc(p.name)}* — ${esc(fmt(p.sellingPrice))} \\| qty: ${esc(p.quantity)}${(p as any).supplierName ? ` \\| ${esc((p as any).supplierName)}` : ""}`
        )
        .join("\n");

      const header = query
        ? `🔍 *Results for "${esc(query)}"* \\(${esc(Math.min(products.length, 20))} of ${esc(products.length)}\\):`
        : `📦 *Products* \\(${esc(Math.min(products.length, 20))} of ${esc(products.length)}\\):`;

      await ctx.replyWithMarkdownV2(`${header}\n\n${rows}`);
    } catch (e: any) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  });

  // ── /sales ────────────────────────────────────────────────────────────────
  bot.command("sales", async (ctx) => {
    try {
      const recent = await storage.getRecentSales(10);
      if (recent.length === 0) {
        return ctx.reply("No sales recorded yet.");
      }

      const rows = recent
        .map(
          (s) =>
            `• *${esc(s.receiptNumber)}* — ${esc(s.customerName)} — ${esc(fmt(s.total))}`
        )
        .join("\n");

      await ctx.replyWithMarkdownV2(
        `🧾 *Recent ${esc(recent.length)} sales:*\n\n${rows}`
      );
    } catch (e: any) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  });

  // ── /report ───────────────────────────────────────────────────────────────
  bot.command("report", async (ctx) => {
    try {
      const [daily, weekly, monthly, stats] = await Promise.all([
        storage.getSalesReportByPeriod("day"),
        storage.getSalesReportByPeriod("week"),
        storage.getSalesReportByPeriod("month"),
        storage.getDashboardStats(),
      ]);

      await ctx.replyWithMarkdownV2(
        `📈 *Sales Report*\n\n` +
          `*Today*\n` +
          `  Revenue: ${esc(fmt(daily.revenue))}\n` +
          `  Profit:  ${esc(fmt(daily.profit))}\n` +
          `  Orders:  ${esc(daily.transactions)}\n\n` +
          `*This Week*\n` +
          `  Revenue: ${esc(fmt(weekly.revenue))}\n` +
          `  Profit:  ${esc(fmt(weekly.profit))}\n` +
          `  Orders:  ${esc(weekly.transactions)}\n\n` +
          `*This Month*\n` +
          `  Revenue: ${esc(fmt(monthly.revenue))}\n` +
          `  Profit:  ${esc(fmt(monthly.profit))}\n` +
          `  Orders:  ${esc(monthly.transactions)}\n\n` +
          `⚠️ Low stock items: *${esc(stats.lowStockCount)}*`
      );
    } catch (e: any) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  });

  // ── inline mode: product search ───────────────────────────────────────────
  bot.on("inline_query", async (ctx) => {
    // Inline mode requires auth — check chat id from inline query user
    const userId = ctx.inlineQuery.from.id;
    if (!authorised.has(userId)) {
      await ctx.answerInlineQuery(
        [
          {
            type: "article",
            id: "locked",
            title: "🔒 Bot is locked",
            description: "Open a private chat with the bot and type /unlock PASSWORD",
            input_message_content: {
              message_text: "Please /unlock the bot first in a private chat.",
            },
          },
        ],
        { cache_time: 0 }
      );
      return;
    }

    const query = ctx.inlineQuery.query.trim();
    try {
      const products = query
        ? await storage.searchProducts(query)
        : (await storage.getProducts()).slice(0, 20);

      const results = products.slice(0, 20).map((p) => ({
        type: "article" as const,
        id: p.id,
        title: p.name,
        description: `${fmt(p.sellingPrice)} | Qty: ${p.quantity} | ${p.stockCode}`,
        input_message_content: {
          message_text:
            `📦 *${p.name}*\n` +
            `Stock Code: \`${p.stockCode}\`\n` +
            `Price: ${fmt(p.sellingPrice)}\n` +
            `Buy Price: ${fmt(p.buyingPrice)}\n` +
            `Qty: ${p.quantity}`,
          parse_mode: "Markdown" as const,
        },
      }));

      await ctx.answerInlineQuery(results, { cache_time: 10 });
    } catch (_) {
      await ctx.answerInlineQuery([], { cache_time: 0 });
    }
  });

  // ── catch-all for unknown text ────────────────────────────────────────────
  bot.on(message("text"), (ctx) =>
    ctx.reply(
      "❓ Unknown command. Type /help to see available commands."
    )
  );

  // ── global error handler ─────────────────────────────────────────────────
  bot.catch((err: unknown, ctx: Context) => {
    console.error(`[telegram] Error for ${ctx.updateType}:`, err);
  });

  // ── launch (long polling) ─────────────────────────────────────────────────
  bot
    .launch({ dropPendingUpdates: true })
    .then(() => console.log("[telegram] Bot started (long polling)."))
    .catch((err) =>
      console.error("[telegram] Failed to start bot:", err.message)
    );

  // Graceful shutdown — do not block process exit
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
