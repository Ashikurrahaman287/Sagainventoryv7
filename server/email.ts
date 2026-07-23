import nodemailer from "nodemailer";
import { storage } from "./storage";

interface SaleEmailData {
  receiptNumber: string;
  customerName: string;
  customerEmail: string;
  sellerName: string;
  date: string;
  deliveryAddress?: string | null;
  items: Array<{
    productName: string;
    stockCode: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }>;
  subtotal: string;
  discount: string;
  discountType: string;
  total: string;
  paymentMethod: string;
  notes?: string | null;
}

// ── Social media footer used in all emails ──────────────────────────────────
const SOCIAL_FOOTER = `
<tr>
  <td style="padding:20px 40px;background:#f8faff;border-top:1px solid #dbeafe;text-align:center;">
    <div style="font-size:12px;color:#6b7280;margin-bottom:12px;">Follow us &amp; stay connected!</div>
    <div style="display:inline-block;">
      <a href="https://www.facebook.com/undergraduate.hub"
         style="display:inline-block;background:#1877F2;color:#ffffff;text-decoration:none;padding:9px 18px;border-radius:8px;font-weight:700;font-size:13px;margin:0 6px;letter-spacing:0.3px;">
        &#x1F4D8; Facebook
      </a>
      <a href="https://www.instagram.com/undergra_hub"
         style="display:inline-block;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#ffffff;text-decoration:none;padding:9px 18px;border-radius:8px;font-weight:700;font-size:13px;margin:0 6px;letter-spacing:0.3px;">
        &#x1F4F7; Instagram
      </a>
    </div>
  </td>
</tr>`;

// ── Shared email shell ───────────────────────────────────────────────────────
function emailShell(title: string, badgeLabel: string, bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">UNDERGRADUATE HUB</div>
            <div style="font-size:13px;color:#bfdbfe;margin-top:4px;letter-spacing:2px;">${badgeLabel}</div>
          </td>
        </tr>
        ${bodyRows}
        ${SOCIAL_FOOTER}
        <tr>
          <td style="background:#1e3a8a;padding:20px 40px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:#ffffff;">Undergraduate Hub</div>
            <div style="font-size:12px;color:#93c5fd;margin-top:4px;">Saga Inventory Management System</div>
            <div style="font-size:11px;color:#60a5fa;margin-top:8px;">This is an automated email. Please do not reply.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Email 1: Order Confirmation + Invoice ────────────────────────────────────
function buildOrderEmailHTML(data: SaleEmailData): string {
  const fmt = (v: string | number) =>
    "৳" + Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const discountAmt =
    data.discountType === "percentage"
      ? (Number(data.subtotal) * Number(data.discount)) / 100
      : Number(data.discount);

  const discountLine =
    Number(data.discount) > 0
      ? `<tr>
          <td colspan="4" style="text-align:right;padding:6px 0;color:#6b7280;font-size:14px;">Discount (${data.discountType === "percentage" ? data.discount + "%" : "Flat"})</td>
          <td style="text-align:right;padding:6px 0;color:#ef4444;font-size:14px;">−${fmt(discountAmt)}</td>
        </tr>`
      : "";

  const itemRows = data.items
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"}">
        <td style="padding:10px 16px;font-size:14px;color:#111827;">${item.productName}</td>
        <td style="padding:10px 16px;font-size:13px;color:#6b7280;text-align:center;font-family:monospace;">${item.stockCode}</td>
        <td style="padding:10px 16px;font-size:14px;color:#374151;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 16px;font-size:14px;color:#374151;text-align:right;font-family:monospace;">${fmt(item.unitPrice)}</td>
        <td style="padding:10px 16px;font-size:14px;font-weight:600;color:#111827;text-align:right;font-family:monospace;">${fmt(item.subtotal)}</td>
      </tr>`
    )
    .join("");

  const deliveryRow = data.deliveryAddress
    ? `<tr>
        <td style="padding:16px 40px 0;">
          <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:6px;">
            <div style="font-size:11px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Delivery Address</div>
            <div style="font-size:14px;color:#1e40af;">${data.deliveryAddress}</div>
          </div>
        </td>
      </tr>`
    : "";

  const bodyRows = `
    <tr>
      <td style="background:#eff6ff;padding:24px 40px;border-bottom:1px solid #dbeafe;">
        <div style="font-size:20px;font-weight:700;color:#1e3a8a;">Thank you, ${data.customerName}! 🎉</div>
        <div style="font-size:14px;color:#4b5563;margin-top:6px;">Your order has been placed successfully. We're so grateful to have you as part of our family! Please find your purchase summary below.</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 40px;">
        <table width="100%">
          <tr>
            <td width="50%"><div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Receipt Number</div><div style="font-size:15px;font-weight:700;color:#1e3a8a;font-family:monospace;">${data.receiptNumber}</div></td>
            <td width="50%" style="text-align:right;"><div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Date</div><div style="font-size:14px;color:#374151;">${data.date}</div></td>
          </tr>
          <tr>
            <td style="padding-top:16px;"><div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Served By</div><div style="font-size:14px;color:#374151;">${data.sellerName}</div></td>
            <td style="padding-top:16px;text-align:right;"><div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Payment</div><div style="font-size:14px;color:#374151;">${data.paymentMethod}</div></td>
          </tr>
        </table>
      </td>
    </tr>
    ${deliveryRow}
    <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;margin-top:16px;"></div></td></tr>
    <tr>
      <td style="padding:24px 0;">
        <div style="padding:0 40px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Items Purchased</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="background:#1e3a8a;">
              <th style="padding:10px 16px;font-size:12px;color:#bfdbfe;text-align:left;font-weight:600;text-transform:uppercase;">Product</th>
              <th style="padding:10px 16px;font-size:12px;color:#bfdbfe;text-align:center;font-weight:600;text-transform:uppercase;">Code</th>
              <th style="padding:10px 16px;font-size:12px;color:#bfdbfe;text-align:center;font-weight:600;text-transform:uppercase;">Qty</th>
              <th style="padding:10px 16px;font-size:12px;color:#bfdbfe;text-align:right;font-weight:600;text-transform:uppercase;">Unit Price</th>
              <th style="padding:10px 16px;font-size:12px;color:#bfdbfe;text-align:right;font-weight:600;text-transform:uppercase;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #e5e7eb;padding-top:12px;">
          <tr><td colspan="4" style="text-align:right;padding:6px 0;color:#6b7280;font-size:14px;">Subtotal</td><td style="text-align:right;padding:6px 0;color:#374151;font-size:14px;font-family:monospace;">${fmt(data.subtotal)}</td></tr>
          ${discountLine}
          <tr style="border-top:2px solid #1e3a8a;"><td colspan="4" style="text-align:right;padding:12px 0;color:#1e3a8a;font-size:17px;font-weight:800;">TOTAL</td><td style="text-align:right;padding:12px 0;color:#1e3a8a;font-size:17px;font-weight:800;font-family:monospace;">${fmt(data.total)}</td></tr>
        </table>
      </td>
    </tr>
    ${data.notes ? `<tr><td style="padding:0 40px 24px;"><div style="background:#fef9c3;border-left:4px solid #fbbf24;padding:12px 16px;border-radius:6px;font-size:13px;color:#78350f;"><strong>Note:</strong> ${data.notes}</div></td></tr>` : ""}
    <tr>
      <td style="padding:0 40px 24px;text-align:center;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;">
          <div style="font-size:15px;font-weight:600;color:#166534;">✅ Order Placed Successfully!</div>
          <div style="font-size:13px;color:#4b5563;margin-top:6px;">We can't wait to prepare your items with care and deliver them to you soon. 💙</div>
        </div>
      </td>
    </tr>`;

  return emailShell(`Order Confirmation — ${data.receiptNumber}`, "ORDER CONFIRMATION", bodyRows);
}

// ── Email 2: Payment Received ────────────────────────────────────────────────
function buildPaymentReceivedEmailHTML(customerName: string, receiptNumber: string, total: string): string {
  const fmt = (v: string | number) =>
    "৳" + Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const bodyRows = `
    <tr>
      <td style="background:#eff6ff;padding:24px 40px;border-bottom:1px solid #dbeafe;">
        <div style="font-size:20px;font-weight:700;color:#1e3a8a;">Dear ${customerName},</div>
        <div style="font-size:14px;color:#4b5563;margin-top:8px;">We're truly delighted to let you know that we have successfully received the full payment for your recent order. Thank you so much for trusting us and for settling the amount so promptly. Your support means the absolute world to us! 🙏</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;">
              <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Receipt Number</div>
              <div style="font-size:16px;font-weight:700;color:#1e3a8a;font-family:monospace;">${receiptNumber}</div>
            </td>
            <td style="padding:20px 24px;text-align:right;">
              <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Amount Received</div>
              <div style="font-size:22px;font-weight:800;color:#166534;font-family:monospace;">${fmt(total)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 28px;text-align:center;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;">
          <div style="font-size:28px;margin-bottom:8px;">💚</div>
          <div style="font-size:15px;font-weight:600;color:#166534;">Payment Confirmed — Thank You!</div>
          <div style="font-size:13px;color:#4b5563;margin-top:8px;">With warm regards and deepest gratitude,<br/><strong>The Undergraduate Hub Team</strong></div>
        </div>
      </td>
    </tr>`;

  return emailShell(`Payment Received — ${receiptNumber}`, "PAYMENT CONFIRMATION", bodyRows);
}

// ── Email 3: Order Delivered ──────────────────────────────────────────────────
function buildOrderDeliveredEmailHTML(customerName: string, receiptNumber: string): string {
  const bodyRows = `
    <tr>
      <td style="background:#eff6ff;padding:24px 40px;border-bottom:1px solid #dbeafe;">
        <div style="font-size:20px;font-weight:700;color:#1e3a8a;">Great news, ${customerName}! 🎉</div>
        <div style="font-size:14px;color:#4b5563;margin-top:8px;">Your order <strong style="color:#1e3a8a;">${receiptNumber}</strong> has been safely delivered with love! We hope everything arrives in perfect condition.</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 40px;text-align:center;">
        <div style="font-size:64px;margin-bottom:12px;">📦✅</div>
        <div style="font-size:18px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">Your Order Has Been Delivered!</div>
        <div style="font-size:14px;color:#4b5563;max-width:440px;margin:0 auto;line-height:1.7;">
          Please take a moment to carefully check your items. If you're happy with your purchase, we would be so grateful if you could leave us a kind review on our page — your feedback truly lights up our day and helps other customers too! ⭐
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 28px;text-align:center;">
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:20px;">
          <div style="font-size:13px;color:#78350f;line-height:1.7;">
            Thank you once again for shopping with us. We can't wait to serve you again soon. 💙<br/>
            <strong>Sending you lots of love,<br/>The Undergraduate Hub Team</strong>
          </div>
        </div>
      </td>
    </tr>`;

  return emailShell(`Your Order Has Been Delivered — ${receiptNumber}`, "ORDER DELIVERED", bodyRows);
}

function isBrevo(host: string) {
  return host?.includes("brevo.com") || host?.includes("sendinblue.com");
}

async function sendViaBrevoApi(opts: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (opts.fromEmail.includes("smtp-brevo.com") || opts.fromEmail.includes("sendinblue.com")) {
    throw new Error(
      "Invalid sender email — the 'From' email cannot be a Brevo SMTP login (like b24xxx@smtp-brevo.com). " +
      "Please update Email Settings: enter your real email address (e.g. yourname@gmail.com) in the sender field, " +
      "then verify it in Brevo → Senders & IP → Senders."
    );
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": opts.apiKey,
    },
    body: JSON.stringify({
      sender: { name: opts.fromName, email: opts.fromEmail },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });

  const body = await res.text();

  if (!res.ok) {
    let msg = `Brevo API error ${res.status}: ${body}`;
    if (res.status === 401) msg = "Invalid Brevo API key. Go to Brevo → SMTP & API → API Keys tab and generate a new key (starts with xkeysib-).";
    if (res.status === 400 && body.includes("sender")) msg = "Sender email not verified in Brevo. Go to Brevo → Senders & IP → Senders and add your email address.";
    throw new Error(msg);
  }

  console.log(`[email] Brevo API sent to ${opts.to} — response: ${body}`);
}

async function sendViaSmtp(opts: {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transport = nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.port === 465,
    auth: { user: opts.user, pass: opts.pass },
    tls: { rejectUnauthorized: false },
  });

  await transport.sendMail({
    from: `"${opts.fromName}" <${opts.fromEmail}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const s = await storage.getSettings();
  const host = s.emailSmtpHost || "";
  const port = parseInt(s.emailSmtpPort || "587");
  const user = s.emailSmtpUser || "";
  const pass = s.emailSmtpPass || "";
  const fromName = s.emailFromName || "Undergraduate Hub";

  if (!host || !user || !pass) {
    throw new Error("Email credentials not configured. Please set them in Email Settings.");
  }

  if (isBrevo(host)) {
    await sendViaBrevoApi({
      apiKey: pass,
      fromEmail: user,
      fromName,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } else {
    await sendViaSmtp({
      host, port, user, pass,
      fromEmail: user,
      fromName,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  }
}

export async function sendOrderConfirmationEmail(
  data: SaleEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await storage.getSettings();
    if (settings.emailEnabled !== "true") {
      return { success: false, error: "Email notifications are disabled" };
    }
    await sendEmail({
      to: data.customerEmail,
      subject: `Thank You! Your Order Has Been Successfully Placed — ${data.receiptNumber}`,
      html: buildOrderEmailHTML(data),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendDeliveryEmails(opts: {
  customerName: string;
  customerEmail: string;
  receiptNumber: string;
  total: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await storage.getSettings();
    if (settings.emailEnabled !== "true") {
      return { success: false, error: "Email notifications are disabled" };
    }

    // Email 2: Payment received
    await sendEmail({
      to: opts.customerEmail,
      subject: `We've Received Your Payment – Thank You! — ${opts.receiptNumber}`,
      html: buildPaymentReceivedEmailHTML(opts.customerName, opts.receiptNumber, opts.total),
    });

    // Email 3: Order delivered — sent a few seconds after Email 2
    setTimeout(async () => {
      try {
        await sendEmail({
          to: opts.customerEmail,
          subject: `Your Order Has Been Delivered with Love — ${opts.receiptNumber}`,
          html: buildOrderDeliveredEmailHTML(opts.customerName, opts.receiptNumber),
        });
      } catch (err) {
        console.error("[email] Failed to send order delivered email:", err);
      }
    }, 5000);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendTestEmail(
  to: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sendEmail({
      to,
      subject: "✅ Email Test — Undergraduate Hub Inventory",
      html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:32px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:32px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:#fff;">UNDERGRADUATE HUB</div>
      <div style="font-size:12px;color:#bfdbfe;margin-top:4px;letter-spacing:2px;">EMAIL TEST</div>
    </div>
    <div style="padding:32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">✅</div>
      <div style="font-size:20px;font-weight:700;color:#1e3a8a;">Email is Working!</div>
      <div style="font-size:14px;color:#6b7280;margin-top:8px;">Your email is correctly configured in Saga Inventory.<br/>Customers will now receive order confirmation emails automatically.</div>
    </div>
    <div style="background:#1e3a8a;padding:16px;text-align:center;">
      <div style="font-size:12px;color:#93c5fd;">Saga Inventory — Automated Email System</div>
    </div>
  </div>
</body></html>`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
