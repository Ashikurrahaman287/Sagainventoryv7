import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendOrderConfirmationEmail, sendTestEmail } from "./email";
import {
  insertSupplierSchema,
  insertCustomerSchema,
  insertSellerSchema,
  insertProductSchema,
  insertSaleSchema,
  insertOperationalCostSchema,
} from "@shared/schema";
import { z } from "zod";
import {
  APP_PASSWORD,
  requireAuth,
  getRateLimitStatus,
  recordFailedAttempt,
  clearFailedAttempts,
} from "./auth";

function getClientIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Health (no auth) ──────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Auth routes (no auth middleware) ──────────────────────────────────────
  app.get("/api/auth/status", (req, res) => {
    const sess = req.session as any;
    res.json({ authenticated: sess.authenticated === true });
  });

  app.post("/api/auth/login", (req, res) => {
    const ip = getClientIp(req);
    const rateLimit = getRateLimitStatus(ip);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${rateLimit.resetInSeconds} seconds.`,
      });
    }

    const { password } = req.body;
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password !== APP_PASSWORD) {
      recordFailedAttempt(ip);
      const updated = getRateLimitStatus(ip);
      return res.status(401).json({
        error: "Incorrect password",
        remainingAttempts: updated.remaining,
      });
    }

    clearFailedAttempts(ip);

    // Regenerate session on login to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: "Session error" });
      }
      const sess = req.session as any;
      sess.authenticated = true;
      sess.loginAt = Date.now();
      res.json({ success: true });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("saga.sid");
      res.json({ success: true });
    });
  });

  // ── Apply auth middleware to all remaining /api routes ────────────────────
  app.use("/api", requireAuth);

  // ── Settings ──────────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    try {
      const data = await storage.getSettings();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const schema = z.record(z.string(), z.string());
      const data = schema.parse(req.body);
      await storage.setSettings(data);
      const updated = await storage.getSettings();
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── Suppliers ─────────────────────────────────────────────────────────────
  app.get("/api/suppliers", async (_req, res) => {
    const suppliers = await storage.getSuppliers();
    res.json(suppliers);
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    const supplier = await storage.getSupplier(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      res.status(201).json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const data = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, data);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const success = await storage.deleteSupplier(req.params.id);
      if (!success) return res.status(404).json({ error: "Supplier not found" });
      res.status(204).send();
    } catch (error: any) {
      if (error.code === "23503")
        return res.status(400).json({ error: "Cannot delete supplier: it has associated products" });
      res.status(500).json({ error: error.message });
    }
  });

  // ── Customers ─────────────────────────────────────────────────────────────
  app.get("/api/customers", async (_req, res) => {
    const customers = await storage.getCustomers();
    const enriched = await Promise.all(
      customers.map(async (c) => ({ ...c, ...(await storage.getCustomerStats(c.id)) }))
    );
    res.json(enriched);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    const stats = await storage.getCustomerStats(customer.id);
    res.json({ ...customer, ...stats });
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, data);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomer(req.params.id);
      if (!success) return res.status(404).json({ error: "Customer not found" });
      res.status(204).send();
    } catch (error: any) {
      if (error.code === "23503")
        return res.status(400).json({ error: "Cannot delete customer: they have associated sales" });
      res.status(500).json({ error: error.message });
    }
  });

  // ── Sellers ───────────────────────────────────────────────────────────────
  app.get("/api/sellers", async (_req, res) => {
    const sellers = await storage.getSellers();
    const enriched = await Promise.all(
      sellers.map(async (s) => ({ ...s, ...(await storage.getSellerStats(s.id)) }))
    );
    res.json(enriched);
  });

  app.get("/api/sellers/:id", async (req, res) => {
    const seller = await storage.getSeller(req.params.id);
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    const stats = await storage.getSellerStats(seller.id);
    res.json({ ...seller, ...stats });
  });

  app.post("/api/sellers", async (req, res) => {
    try {
      const data = insertSellerSchema.parse(req.body);
      const seller = await storage.createSeller(data);
      res.status(201).json(seller);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/sellers/:id", async (req, res) => {
    try {
      const data = insertSellerSchema.partial().parse(req.body);
      const seller = await storage.updateSeller(req.params.id, data);
      if (!seller) return res.status(404).json({ error: "Seller not found" });
      res.json(seller);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sellers/:id", async (req, res) => {
    try {
      const success = await storage.deleteSeller(req.params.id);
      if (!success) return res.status(404).json({ error: "Seller not found" });
      res.status(204).send();
    } catch (error: any) {
      if (error.code === "23503")
        return res.status(400).json({ error: "Cannot delete seller: they have associated sales" });
      res.status(500).json({ error: error.message });
    }
  });

  // ── Products ──────────────────────────────────────────────────────────────
  app.get("/api/products", async (req, res) => {
    const { search } = req.query;
    const products =
      search && typeof search === "string"
        ? await storage.searchProducts(search)
        : await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    try {
      const normalizedBody = {
        ...req.body,
        supplierId:
          req.body.supplierId && String(req.body.supplierId).trim() !== ""
            ? req.body.supplierId
            : null,
      };
      const data = insertProductSchema.parse(normalizedBody);

      if (data.stockCode) {
        const existing = await storage.getProductByStockCode(data.stockCode);
        if (existing) return res.status(409).json({ error: "A product with this stock code already exists" });
      }

      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error: any) {
      if (error.code === "23505")
        return res.status(409).json({ error: "A product with this stock code already exists" });
      if (error.code === "23503")
        return res.status(400).json({ error: "Invalid supplier selected" });
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const normalizedBody = {
        ...req.body,
        supplierId:
          req.body.supplierId !== undefined &&
          req.body.supplierId !== null &&
          String(req.body.supplierId).trim() !== ""
            ? req.body.supplierId
            : null,
      };
      const data = insertProductSchema.partial().parse(normalizedBody);

      if (data.stockCode) {
        const existing = await storage.getProductByStockCode(data.stockCode);
        if (existing && existing.id !== req.params.id)
          return res.status(409).json({ error: "A product with this stock code already exists" });
      }

      const product = await storage.updateProduct(req.params.id, data);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error: any) {
      if (error.code === "23505")
        return res.status(409).json({ error: "A product with this stock code already exists" });
      if (error.code === "23503")
        return res.status(400).json({ error: "Invalid supplier selected" });
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) return res.status(404).json({ error: "Product not found" });
      res.status(204).send();
    } catch (error: any) {
      if (error.code === "23503")
        return res.status(400).json({ error: "Cannot delete product: it has been sold" });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products/:id/adjust-stock", async (req, res) => {
    try {
      const schema = z.object({
        quantity: z.number().int(),
        type: z.enum(["add", "set"]),
      });
      const { quantity, type } = schema.parse(req.body);
      if (type === "set" && quantity < 0)
        return res.status(400).json({ error: "Stock quantity cannot be negative" });
      const product = await storage.adjustProductStock(req.params.id, quantity, type);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ── Sales ─────────────────────────────────────────────────────────────────
  app.get("/api/sales/recent", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const sales = await storage.getRecentSales(limit);
    res.json(sales);
  });

  app.get("/api/sales", async (_req, res) => {
    const sales = await storage.getSales();
    res.json(sales);
  });

  app.get("/api/sales/:id", async (req, res) => {
    const saleWithItems = await storage.getSaleWithItems(req.params.id);
    if (!saleWithItems) return res.status(404).json({ error: "Sale not found" });
    res.json(saleWithItems);
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const data = insertSaleSchema.parse(req.body);
      const result = await storage.createSale(data);
      res.status(201).json(result);

      // Send order confirmation email (non-blocking)
      try {
        const customer = await storage.getCustomer(result.sale.customerId);
        const seller = await storage.getSeller(result.sale.sellerId);
        if (customer?.email) {
          sendOrderConfirmationEmail({
            receiptNumber: result.sale.receiptNumber,
            customerName: customer.name,
            customerEmail: customer.email,
            sellerName: seller?.name || "—",
            date: new Date(result.sale.createdAt).toLocaleDateString("en-BD", {
              day: "2-digit", month: "long", year: "numeric",
            }),
            items: result.items.map((item) => ({
              productName: item.productName,
              stockCode: item.stockCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            subtotal: result.sale.subtotal,
            discount: result.sale.discount,
            discountType: result.sale.discountType,
            total: result.sale.total,
            paymentMethod: result.sale.paymentMethod,
            notes: result.sale.notes,
          }).catch(() => {});
        }
      } catch (_) {}
    } catch (error: any) {
      if (error.code === "23503")
        return res.status(400).json({ error: "Invalid customer, seller, or product" });
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sales/all", async (_req, res) => {
    try {
      const count = await storage.clearAllSales();
      res.json({ deleted: count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const success = await storage.deleteSale(req.params.id);
      if (!success) return res.status(404).json({ error: "Sale not found" });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/low-stock", async (req, res) => {
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 20;
    const products = await storage.getLowStockProducts(threshold);
    res.json(products);
  });

  app.get("/api/dashboard/chart", async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const data = await storage.getDailyChartData(days);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Reports ───────────────────────────────────────────────────────────────
  app.get("/api/reports/stock", async (_req, res) => {
    const report = await (storage as any).getStockReportByCategory();
    res.json(report);
  });

  app.get("/api/reports/sales", async (req, res) => {
    const period = (req.query.period as string) || "today";
    const report = await (storage as any).getSalesReportByPeriod(period);
    res.json(report);
  });

  app.get("/api/reports/customers", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const customers = await (storage as any).getTopCustomers(limit);
    res.json(customers);
  });

  // ── Email ─────────────────────────────────────────────────────────────────
  app.get("/api/email/config", async (_req, res) => {
    try {
      const s = await storage.getSettings();
      res.json({
        host: s.emailSmtpHost || "(not set)",
        port: s.emailSmtpPort || "(not set)",
        user: s.emailSmtpUser || "(not set)",
        hasPassword: !!(s.emailSmtpPass),
        passwordLength: s.emailSmtpPass?.length ?? 0,
        enabled: s.emailEnabled,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email/test", async (req, res) => {
    try {
      const { to } = req.body;
      if (!to) return res.status(400).json({ error: "Recipient email required" });
      const result = await sendTestEmail(to);
      if (!result.success) return res.status(400).json({ error: result.error });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Operational Costs ─────────────────────────────────────────────────────
  app.get("/api/operational-costs", async (_req, res) => {
    try {
      const costs = await storage.getOperationalCosts();
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/operational-costs/monthly", async (req, res) => {
    try {
      const months = req.query.months ? parseInt(req.query.months as string) : 6;
      const data = await storage.getOperationalCostMonthly(months);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/operational-costs/:id", async (req, res) => {
    try {
      const cost = await storage.getOperationalCost(req.params.id);
      if (!cost) return res.status(404).json({ error: "Cost not found" });
      res.json(cost);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/operational-costs", async (req, res) => {
    try {
      const data = insertOperationalCostSchema.parse(req.body);
      const cost = await storage.createOperationalCost(data);
      res.status(201).json(cost);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/operational-costs/:id", async (req, res) => {
    try {
      const data = insertOperationalCostSchema.partial().parse(req.body);
      const cost = await storage.updateOperationalCost(req.params.id, data);
      if (!cost) return res.status(404).json({ error: "Cost not found" });
      res.json(cost);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/operational-costs/:id", async (req, res) => {
    try {
      const success = await storage.deleteOperationalCost(req.params.id);
      if (!success) return res.status(404).json({ error: "Cost not found" });
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Audit ─────────────────────────────────────────────────────────────────
  app.get("/api/audit/summary", async (_req, res) => {
    try {
      const [allSalesReport, yearReport, products, customers, suppliers, sellers, opCosts] = await Promise.all([
        (storage as any).getSalesReportByPeriod("all"),
        (storage as any).getSalesReportByPeriod("year"),
        storage.getProducts(),
        storage.getCustomers(),
        storage.getSuppliers(),
        storage.getSellers(),
        storage.getOperationalCosts(),
      ]);

      const totalOpCosts = opCosts.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      const inventoryValue = products.reduce((sum: any, p: any) => sum + Number(p.sellingPrice) * p.quantity, 0);
      const inventoryCostValue = products.reduce((sum: any, p: any) => sum + Number(p.buyingPrice) * p.quantity, 0);

      res.json({
        totalRevenue: allSalesReport.revenue,
        totalProfit: allSalesReport.profit,
        totalTransactions: allSalesReport.transactions,
        yearRevenue: yearReport.revenue,
        yearProfit: yearReport.profit,
        yearTransactions: yearReport.transactions,
        totalProducts: products.length,
        inventoryValue,
        inventoryCostValue,
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length,
        totalSellers: sellers.length,
        totalOpCosts,
        netProfit: allSalesReport.profit - totalOpCosts,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
