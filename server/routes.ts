import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertSupplierSchema,
  insertCustomerSchema,
  insertSellerSchema,
  insertProductSchema,
  insertSaleSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Settings
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

  // Suppliers
  app.get("/api/suppliers", async (_req, res) => {
    const suppliers = await storage.getSuppliers();
    res.json(suppliers);
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    const supplier = await storage.getSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
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
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const success = await storage.deleteSupplier(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(400).json({ error: "Cannot delete supplier because it has associated products" });
      }
      res.status(500).json({ error: error.message || "Failed to delete supplier" });
    }
  });

  // Customers
  app.get("/api/customers", async (_req, res) => {
    const customers = await storage.getCustomers();
    const enriched = await Promise.all(
      customers.map(async (customer) => {
        const stats = await storage.getCustomerStats(customer.id);
        return { ...customer, ...stats };
      })
    );
    res.json(enriched);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
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
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(400).json({ error: "Cannot delete customer because they have associated sales" });
      }
      res.status(500).json({ error: error.message || "Failed to delete customer" });
    }
  });

  // Sellers
  app.get("/api/sellers", async (_req, res) => {
    const sellers = await storage.getSellers();
    const enriched = await Promise.all(
      sellers.map(async (seller) => {
        const stats = await storage.getSellerStats(seller.id);
        return { ...seller, ...stats };
      })
    );
    res.json(enriched);
  });

  app.get("/api/sellers/:id", async (req, res) => {
    const seller = await storage.getSeller(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }
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
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.json(seller);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sellers/:id", async (req, res) => {
    try {
      const success = await storage.deleteSeller(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(400).json({ error: "Cannot delete seller because they have associated sales" });
      }
      res.status(500).json({ error: error.message || "Failed to delete seller" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const { search } = req.query;
    let products;
    if (search && typeof search === "string") {
      products = await storage.searchProducts(search);
    } else {
      products = await storage.getProducts();
    }
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    try {
      const normalizedBody = {
        ...req.body,
        supplierId: req.body.supplierId && req.body.supplierId.trim() !== "" ? req.body.supplierId : null,
      };
      const data = insertProductSchema.parse(normalizedBody);

      if (data.stockCode) {
        const existingProduct = await storage.getProductByStockCode(data.stockCode);
        if (existingProduct) {
          return res.status(409).json({ error: "A product with this stock code already exists" });
        }
      }

      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: "A product with this stock code already exists" });
      }
      if (error.code === '23503') {
        return res.status(400).json({ error: "Invalid supplier selected" });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const normalizedBody = {
        ...req.body,
        supplierId: req.body.supplierId !== undefined && req.body.supplierId !== null && String(req.body.supplierId).trim() !== ""
          ? req.body.supplierId
          : null,
      };
      const data = insertProductSchema.partial().parse(normalizedBody);

      if (data.stockCode) {
        const existingProduct = await storage.getProductByStockCode(data.stockCode);
        if (existingProduct && existingProduct.id !== req.params.id) {
          return res.status(409).json({ error: "A product with this stock code already exists" });
        }
      }

      const product = await storage.updateProduct(req.params.id, data);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: "A product with this stock code already exists" });
      }
      if (error.code === '23503') {
        return res.status(400).json({ error: "Invalid supplier selected" });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(400).json({ error: "Cannot delete product because it has been sold" });
      }
      res.status(500).json({ error: error.message || "Failed to delete product" });
    }
  });

  // Stock adjustment
  app.post("/api/products/:id/adjust-stock", async (req, res) => {
    try {
      const schema = z.object({
        quantity: z.number().int(),
        type: z.enum(['add', 'set']),
      });
      const { quantity, type } = schema.parse(req.body);

      if (type === 'set' && quantity < 0) {
        return res.status(400).json({ error: "Stock quantity cannot be negative" });
      }

      const product = await storage.adjustProductStock(req.params.id, quantity, type);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Sales — order matters: specific routes before parameterized
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
    if (!saleWithItems) {
      return res.status(404).json({ error: "Sale not found" });
    }
    res.json(saleWithItems);
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const data = insertSaleSchema.parse(req.body);
      const result = await storage.createSale(data);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(400).json({ error: "Invalid customer, seller, or product selected" });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Dashboard
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

  // Reports & Analytics
  app.get("/api/reports/stock", async (_req, res) => {
    const report = await (storage as any).getStockReportByCategory();
    res.json(report);
  });

  app.get("/api/reports/sales", async (req, res) => {
    const period = (req.query.period as string) || 'today';
    const report = await (storage as any).getSalesReportByPeriod(period);
    res.json(report);
  });

  app.get("/api/reports/customers", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const customers = await (storage as any).getTopCustomers(limit);
    res.json(customers);
  });

  const httpServer = createServer(app);
  return httpServer;
}
