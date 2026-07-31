import { eq, desc, sql, like, or, and, gte, SQL } from "drizzle-orm";
import { db, schema } from "./db";
import type {
  Supplier,
  Customer,
  Seller,
  Product,
  Sale,
  SaleItem,
  SmsLog,
  InsertSupplier,
  InsertCustomer,
  InsertSeller,
  InsertProduct,
  InsertSale,
  OperationalCost,
  InsertOperationalCost,
} from "@shared/schema";

const { suppliers, customers, sellers, products, sales, saleItems, settings, operationalCosts, smsLogs } = schema;

// Extended sale type for internal packaging use (includes packagingCost)
export type SaleWithDetails = Sale & { customerName: string; sellerName: string };

export interface IStorage {
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  // Sellers
  getSellers(): Promise<Seller[]>;
  getSeller(id: string): Promise<Seller | undefined>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller | undefined>;
  deleteSeller(id: string): Promise<boolean>;

  // Products
  getProducts(): Promise<(Product & { supplierName?: string | null })[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductByStockCode(stockCode: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  searchProducts(query: string): Promise<Product[]>;
  adjustProductStock(id: string, quantity: number, type: 'add' | 'set'): Promise<Product | undefined>;

  // Sales
  getSales(): Promise<Array<Sale & { customerName: string; sellerName: string }>>;
  getSale(id: string): Promise<Sale | undefined>;
  getSaleWithItems(id: string): Promise<{ sale: Sale; items: SaleItem[]; customerName: string; sellerName: string; customerEmail: string; customerPhone: string } | undefined>;
  createSale(sale: InsertSale): Promise<{ sale: Sale; items: SaleItem[] }>;
  markSaleDelivered(id: string, paymentReceived: boolean): Promise<Sale | undefined>;
  markOrderPacked(id: string): Promise<Sale | undefined>;
  deleteSale(id: string): Promise<boolean>;
  clearAllSales(): Promise<number>;

  // Packaging
  getPackagingOrders(): Promise<Array<Sale & { customerName: string; sellerName: string; items: SaleItem[] }>>;

  // Delivery (with date-based grouping data)
  getDeliveryOrders(): Promise<Array<Sale & { customerName: string; sellerName: string }>>;

  // Settings
  getSetting(key: string): Promise<string | undefined>;
  getSettings(): Promise<Record<string, string>>;
  setSetting(key: string, value: string): Promise<void>;
  setSettings(data: Record<string, string>): Promise<void>;

  // Operational Costs
  getOperationalCosts(): Promise<OperationalCost[]>;
  getOperationalCost(id: string): Promise<OperationalCost | undefined>;
  createOperationalCost(data: InsertOperationalCost): Promise<OperationalCost>;
  updateOperationalCost(id: string, data: Partial<InsertOperationalCost>): Promise<OperationalCost | undefined>;
  deleteOperationalCost(id: string): Promise<boolean>;
  getOperationalCostMonthly(months: number): Promise<Array<{ month: string; total: number }>>;

  // Analytics
  getDashboardStats(): Promise<{
    totalProducts: number;
    todaysSales: number;
    lowStockCount: number;
    todaysProfit: number;
  }>;
  getLowStockProducts(threshold: number): Promise<Product[]>;
  getRecentSales(limit: number): Promise<Array<Sale & { customerName: string; sellerName: string }>>;
  getCustomerStats(customerId: string): Promise<{ totalPurchases: number; totalSpent: number }>;
  getSellerStats(sellerId: string): Promise<{ totalSales: number; totalRevenue: number }>;
  getDailyChartData(days: number): Promise<Array<{ date: string; sales: number; profit: number }>>;

  // Reports
  getStockReportByCategory(): Promise<Array<{ category: string; products: number; value: number; costValue: number; totalQuantity: number; status: string }>>;
  getSalesReportByPeriod(period: string): Promise<{ transactions: number; revenue: number; profit: number }>;
  getTopCustomers(limit?: number): Promise<Array<{ name: string; purchases: number; spent: number }>>;

  // Universities
  getUniversityStats(): Promise<Array<{ university: string; salesCount: number; revenue: number; uniqueCustomers: number }>>;
  getTopUniversities(limit?: number): Promise<Array<{ university: string; salesCount: number; revenue: number }>>;

  // SMS Logs
  createSmsLog(data: {
    event: string;
    recipient: string;
    message: string;
    requestId?: string;
    status: string;
    error?: string;
    saleId?: string;
    receiptNumber?: string;
  }): Promise<SmsLog>;
  getSmsLogs(limit?: number): Promise<SmsLog[]>;
  getSmsStats(): Promise<{ total: number; sent: number; failed: number }>;
}

// Helper to select all sale columns
const saleColumns = {
  id: sales.id,
  receiptNumber: sales.receiptNumber,
  customerId: sales.customerId,
  sellerId: sales.sellerId,
  subtotal: sales.subtotal,
  discount: sales.discount,
  discountType: sales.discountType,
  total: sales.total,
  paymentMethod: sales.paymentMethod,
  notes: sales.notes,
  deliveryAddress: sales.deliveryAddress,
  deliveryDate: sales.deliveryDate,
  deliveryTime: sales.deliveryTime,
  packagingCost: sales.packagingCost,
  orderStatus: sales.orderStatus,
  amountPaid: sales.amountPaid,
  deliveredAt: sales.deliveredAt,
  university: sales.university,
  createdAt: sales.createdAt,
};

export class DbStorage implements IStorage {
  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return result[0];
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values(supplier).returning();
    return result[0];
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const result = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return result[0];
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning();
    return result.length > 0;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  // Sellers
  async getSellers(): Promise<Seller[]> {
    return db.select().from(sellers).orderBy(desc(sellers.createdAt));
  }

  async getSeller(id: string): Promise<Seller | undefined> {
    const result = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1);
    return result[0];
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const result = await db.insert(sellers).values(seller).returning();
    return result[0];
  }

  async updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller | undefined> {
    const result = await db.update(sellers).set(seller).where(eq(sellers.id, id)).returning();
    return result[0];
  }

  async deleteSeller(id: string): Promise<boolean> {
    const result = await db.delete(sellers).where(eq(sellers.id, id)).returning();
    return result.length > 0;
  }

  // Products — include supplier name
  async getProducts(): Promise<(Product & { supplierName?: string | null })[]> {
    const result = await db
      .select({
        id: products.id,
        stockCode: products.stockCode,
        name: products.name,
        category: products.category,
        buyingPrice: products.buyingPrice,
        sellingPrice: products.sellingPrice,
        quantity: products.quantity,
        supplierId: products.supplierId,
        createdAt: products.createdAt,
        supplierName: suppliers.name,
      })
      .from(products)
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .orderBy(desc(products.createdAt));
    return result;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getProductByStockCode(stockCode: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.stockCode, stockCode)).limit(1);
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(products).where(
      or(
        like(products.name, searchPattern),
        like(products.stockCode, searchPattern),
        like(products.category, searchPattern)
      )
    ).limit(20);
  }

  async adjustProductStock(id: string, quantity: number, type: 'add' | 'set'): Promise<Product | undefined> {
    let result;
    if (type === 'set') {
      result = await db.update(products)
        .set({ quantity })
        .where(eq(products.id, id))
        .returning();
    } else {
      result = await db.update(products)
        .set({ quantity: sql`${products.quantity} + ${quantity}` })
        .where(eq(products.id, id))
        .returning();
    }
    return result[0];
  }

  // Sales — always join with customer and seller names
  async getSales(): Promise<Array<Sale & { customerName: string; sellerName: string }>> {
    return db.select({
      ...saleColumns,
      customerName: customers.name,
      sellerName: sellers.name,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .innerJoin(sellers, eq(sales.sellerId, sellers.id))
    .orderBy(desc(sales.createdAt));
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    return result[0];
  }

  async getSaleWithItems(id: string): Promise<{ sale: Sale; items: SaleItem[]; customerName: string; sellerName: string; customerEmail: string; customerPhone: string } | undefined> {
    const saleResult = await db
      .select({
        ...saleColumns,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        sellerName: sellers.name,
      })
      .from(sales)
      .innerJoin(customers, eq(sales.customerId, customers.id))
      .innerJoin(sellers, eq(sales.sellerId, sellers.id))
      .where(eq(sales.id, id))
      .limit(1);

    if (!saleResult[0]) return undefined;

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
    const { customerName, sellerName, customerEmail, customerPhone, ...sale } = saleResult[0] as any;
    return { sale, items, customerName, sellerName, customerEmail, customerPhone };
  }

  async createSale(saleData: InsertSale): Promise<{ sale: Sale; items: SaleItem[] }> {
    const { items: saleItemsData, ...saleInfo } = saleData;

    // Validate stock for all items first (before opening the transaction)
    for (const item of saleItemsData) {
      const product = await this.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}`);
      }
    }

    // Generate unique receipt number using timestamp + random suffix to avoid race conditions
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = now.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const receiptNumber = `RCP-${year}-${timestamp}${random}`;

    // Run the entire sale creation atomically so a mid-flight failure can't leave orphaned records
    return await db.transaction(async (tx) => {
      const [sale] = await tx.insert(sales).values({
        ...saleInfo,
        receiptNumber,
        orderStatus: 'packaging',
      }).returning();

      const items: SaleItem[] = [];
      for (const item of saleItemsData) {
        const [inserted] = await tx.insert(saleItems).values({
          ...item,
          saleId: sale.id,
        }).returning();
        items.push(inserted);

        // Decrease product quantity atomically
        await tx.update(products)
          .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      return { sale, items };
    });
  }

  async rescheduleDelivery(id: string, deliveryDate: string | null, deliveryTime: string | null): Promise<Sale | undefined> {
    const result = await db.update(sales)
      .set({ deliveryDate, deliveryTime } as any)
      .where(eq(sales.id, id))
      .returning();
    return result[0];
  }

  async cancelOrder(id: string): Promise<Sale | undefined> {
    return await db.transaction(async (tx) => {
      // Fetch the order inside the transaction to get a consistent status
      const [existing] = await tx.select().from(sales).where(eq(sales.id, id));
      if (!existing) return undefined;

      // Idempotent: if already cancelled, return without touching inventory
      if ((existing as any).orderStatus === 'cancelled') return existing;

      // Restore inventory for each sale item
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));
      for (const item of items) {
        await tx.update(products)
          .set({ quantity: sql`${products.quantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      const [updated] = await tx.update(sales)
        .set({ orderStatus: 'cancelled' } as any)
        .where(eq(sales.id, id))
        .returning();
      return updated;
    });
  }

  async markOrderPacked(id: string): Promise<Sale | undefined> {
    const result = await db.update(sales)
      .set({ orderStatus: 'ready_for_delivery' })
      .where(eq(sales.id, id))
      .returning();
    return result[0];
  }

  async markSaleDelivered(id: string, paymentReceived: boolean): Promise<Sale | undefined> {
    const updates: Record<string, unknown> = {
      deliveredAt: new Date(),
      orderStatus: 'delivered',
    };
    if (paymentReceived) {
      const existing = await this.getSale(id);
      if (existing) {
        updates.amountPaid = existing.total;
      }
    }
    const result = await db.update(sales).set(updates as any).where(eq(sales.id, id)).returning();
    return result[0];
  }

  // Packaging
  async getPackagingOrders(): Promise<Array<Sale & { customerName: string; sellerName: string; items: SaleItem[] }>> {
    const rows = await db.select({
      ...saleColumns,
      customerName: customers.name,
      sellerName: sellers.name,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .innerJoin(sellers, eq(sales.sellerId, sellers.id))
    .where(eq(sales.orderStatus, 'packaging'))
    .orderBy(desc(sales.createdAt));

    // Attach items for each order
    const result = await Promise.all(rows.map(async (row) => {
      const { customerName, sellerName, ...sale } = row as any;
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
      return { ...sale, customerName, sellerName, items };
    }));

    return result;
  }

  // Delivery: orders that are 'ready_for_delivery' (packed but not yet delivered)
  async getDeliveryOrders(): Promise<Array<Sale & { customerName: string; sellerName: string }>> {
    return db.select({
      ...saleColumns,
      customerName: customers.name,
      sellerName: sellers.name,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .innerJoin(sellers, eq(sales.sellerId, sellers.id))
    .where(
      or(
        eq(sales.orderStatus, 'ready_for_delivery'),
        eq(sales.orderStatus, 'delivered'),
      )!
    )
    .orderBy(desc(sales.createdAt));
  }

  async deleteSale(id: string): Promise<boolean> {
    await db.delete(smsLogs).where(eq(smsLogs.saleId, id));
    await db.delete(saleItems).where(eq(saleItems.saleId, id));
    const result = await db.delete(sales).where(eq(sales.id, id)).returning();
    return result.length > 0;
  }

  async clearAllSales(): Promise<number> {
    await db.delete(smsLogs);
    await db.delete(saleItems);
    const result = await db.delete(sales).returning();
    return result.length;
  }

  // Settings
  async getSetting(key: string): Promise<string | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0]?.value;
  }

  async getSettings(): Promise<Record<string, string>> {
    const result = await db.select().from(settings);
    return Object.fromEntries(result.map(r => [r.key, r.value]));
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }

  async setSettings(data: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.setSetting(key, value);
    }
  }

  // Analytics
  async getDashboardStats() {
    const totalProductsResult = await db.select({ count: sql<number>`count(*)` }).from(products);
    const totalProducts = Number(totalProductsResult[0].count);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysSalesResult = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${sales.total} AS NUMERIC)), 0)`,
    })
    .from(sales)
    .where(gte(sales.createdAt, today));

    const todaysSales = Number(todaysSalesResult[0]?.total || 0);

    // Use saved threshold or default 20
    const thresholdSetting = await this.getSetting('lowStockThreshold');
    const threshold = thresholdSetting ? parseInt(thresholdSetting) : 20;

    const lowStockResult = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(sql`${products.quantity} < ${threshold}`);
    const lowStockCount = Number(lowStockResult[0].count);

    // Real profit from actual buying prices in sale_items
    const todaysProfitResult = await db.select({
      profit: sql<number>`
        COALESCE(SUM(
          (CAST(${saleItems.unitPrice} AS NUMERIC) - CAST(${saleItems.buyingPrice} AS NUMERIC))
          * ${saleItems.quantity}
        ), 0)
      `
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(gte(sales.createdAt, today));

    const todaysProfit = Number(todaysProfitResult[0]?.profit || 0);

    return {
      totalProducts,
      todaysSales,
      lowStockCount,
      todaysProfit,
    };
  }

  async getLowStockProducts(threshold: number = 20): Promise<Product[]> {
    // Also respect saved threshold setting
    const thresholdSetting = await this.getSetting('lowStockThreshold');
    const effectiveThreshold = thresholdSetting ? parseInt(thresholdSetting) : threshold;
    return db.select().from(products)
      .where(sql`${products.quantity} < ${effectiveThreshold}`)
      .orderBy(products.quantity);
  }

  async getRecentSales(limit: number = 10) {
    return db.select({
      ...saleColumns,
      customerName: customers.name,
      sellerName: sellers.name,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .innerJoin(sellers, eq(sales.sellerId, sellers.id))
    .orderBy(desc(sales.createdAt))
    .limit(limit);
  }

  async getCustomerStats(customerId: string) {
    const result = await db.select({
      totalPurchases: sql<number>`count(*)`,
      totalSpent: sql<number>`COALESCE(SUM(CAST(${sales.total} AS NUMERIC)), 0)`,
    })
    .from(sales)
    .where(eq(sales.customerId, customerId));

    return {
      totalPurchases: Number(result[0]?.totalPurchases || 0),
      totalSpent: Number(result[0]?.totalSpent || 0),
    };
  }

  async getSellerStats(sellerId: string) {
    const result = await db.select({
      totalSales: sql<number>`count(*)`,
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${sales.total} AS NUMERIC)), 0)`,
    })
    .from(sales)
    .where(eq(sales.sellerId, sellerId));

    return {
      totalSales: Number(result[0]?.totalSales || 0),
      totalRevenue: Number(result[0]?.totalRevenue || 0),
    };
  }

  async getStockReportByCategory() {
    const thresholdSetting = await this.getSetting('lowStockThreshold');
    const threshold = thresholdSetting ? parseInt(thresholdSetting) : 20;

    const result = await db.select({
      category: products.category,
      productCount: sql<number>`count(*)`,
      totalValue: sql<number>`COALESCE(SUM(CAST(${products.quantity} AS NUMERIC) * CAST(${products.sellingPrice} AS NUMERIC)), 0)`,
      totalCostValue: sql<number>`COALESCE(SUM(CAST(${products.quantity} AS NUMERIC) * CAST(${products.buyingPrice} AS NUMERIC)), 0)`,
      lowStockCount: sql<number>`COUNT(CASE WHEN CAST(${products.quantity} AS INTEGER) < ${threshold} THEN 1 END)`,
      totalQuantity: sql<number>`COALESCE(SUM(${products.quantity}), 0)`,
    })
    .from(products)
    .groupBy(products.category)
    .orderBy(sql`${products.category}`);

    return result.map((row: any) => ({
      category: row.category,
      products: Number(row.productCount),
      value: Number(row.totalValue),
      costValue: Number(row.totalCostValue),
      totalQuantity: Number(row.totalQuantity),
      status: Number(row.lowStockCount) > 0 ? 'low' : 'healthy',
    }));
  }

  async getSalesReportByPeriod(period: string) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const salesResult = await db.select({
      transactions: sql<number>`count(*)`,
      revenue: sql<number>`COALESCE(SUM(CAST(${sales.total} AS NUMERIC)), 0)`,
    })
    .from(sales)
    .where(gte(sales.createdAt, startDate));

    // Real profit from actual buying prices
    const profitResult = await db.select({
      profit: sql<number>`
        COALESCE(SUM(
          (CAST(${saleItems.unitPrice} AS NUMERIC) - CAST(${saleItems.buyingPrice} AS NUMERIC))
          * ${saleItems.quantity}
        ), 0)
      `
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(gte(sales.createdAt, startDate));

    return {
      transactions: Number(salesResult[0]?.transactions || 0),
      revenue: Number(salesResult[0]?.revenue || 0),
      profit: Number(profitResult[0]?.profit || 0),
    };
  }

  async getTopCustomers(limit: number = 10) {
    const result = await db.select({
      customerId: sales.customerId,
      customerName: customers.name,
      purchases: sql<number>`count(*)`,
      spent: sql<number>`COALESCE(SUM(CAST(${sales.total} AS NUMERIC)), 0)`,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .groupBy(sales.customerId, customers.name)
    .orderBy(desc(sql<number>`COALESCE(SUM(CAST(${sales.total} AS NUMERIC)), 0)`))
    .limit(limit);

    return result.map((row: any) => ({
      name: row.customerName,
      purchases: Number(row.purchases),
      spent: Number(row.spent),
    }));
  }

  // Operational Costs
  async getOperationalCosts(): Promise<OperationalCost[]> {
    return db.select().from(operationalCosts).orderBy(desc(operationalCosts.date));
  }

  async getOperationalCost(id: string): Promise<OperationalCost | undefined> {
    const result = await db.select().from(operationalCosts).where(eq(operationalCosts.id, id)).limit(1);
    return result[0];
  }

  async createOperationalCost(data: InsertOperationalCost): Promise<OperationalCost> {
    const result = await db.insert(operationalCosts).values(data).returning();
    return result[0];
  }

  async updateOperationalCost(id: string, data: Partial<InsertOperationalCost>): Promise<OperationalCost | undefined> {
    const result = await db.update(operationalCosts).set(data).where(eq(operationalCosts.id, id)).returning();
    return result[0];
  }

  async deleteOperationalCost(id: string): Promise<boolean> {
    const result = await db.delete(operationalCosts).where(eq(operationalCosts.id, id)).returning();
    return result.length > 0;
  }

  async getOperationalCostMonthly(months: number = 6): Promise<Array<{ month: string; total: number }>> {
    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${month}`;
      const result = await db.select({
        total: sql<number>`COALESCE(SUM(CAST(${operationalCosts.amount} AS NUMERIC)), 0)`,
      }).from(operationalCosts).where(sql`${operationalCosts.date} LIKE ${prefix + '%'}`);
      results.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: Number(result[0]?.total || 0),
      });
    }
    return results;
  }

  async getDailyChartData(days: number = 7): Promise<Array<{ date: string; sales: number; profit: number }>> {
    const results = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const salesResult = await db.select({
        total: sql<number>`COALESCE(SUM(CAST(${sales.total} AS NUMERIC)), 0)`,
      })
      .from(sales)
      .where(and(gte(sales.createdAt, date), sql`${sales.createdAt} < ${nextDate}`));

      const profitResult = await db.select({
        profit: sql<number>`COALESCE(SUM((CAST(${saleItems.unitPrice} AS NUMERIC) - CAST(${saleItems.buyingPrice} AS NUMERIC)) * ${saleItems.quantity}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(gte(sales.createdAt, date), sql`${sales.createdAt} < ${nextDate}`));

      results.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: Number(salesResult[0]?.total || 0),
        profit: Number(profitResult[0]?.profit || 0),
      });
    }
    return results;
  }

  // Universities
  async getUniversityStats(): Promise<Array<{ university: string; salesCount: number; revenue: number; uniqueCustomers: number }>> {
    const rows = await db.select({
      university: sales.university,
      salesCount: sql<number>`count(*)::int`,
      revenue: sql<number>`sum(${sales.total})::float`,
      uniqueCustomers: sql<number>`count(distinct ${sales.customerId})::int`,
    })
    .from(sales)
    .where(sql`${sales.university} is not null and ${sales.university} != ''`)
    .groupBy(sales.university)
    .orderBy(desc(sql`sum(${sales.total})`));

    return rows.map((r) => ({
      university: r.university!,
      salesCount: Number(r.salesCount),
      revenue: Number(r.revenue),
      uniqueCustomers: Number(r.uniqueCustomers),
    }));
  }

  async getTopUniversities(limit = 10): Promise<Array<{ university: string; salesCount: number; revenue: number }>> {
    const stats = await this.getUniversityStats();
    return stats.slice(0, limit).map(({ university, salesCount, revenue }) => ({ university, salesCount, revenue }));
  }

  // SMS Logs
  async createSmsLog(data: {
    event: string;
    recipient: string;
    message: string;
    requestId?: string;
    status: string;
    error?: string;
    saleId?: string;
    receiptNumber?: string;
  }): Promise<SmsLog> {
    const [row] = await db.insert(smsLogs).values({
      event: data.event,
      recipient: data.recipient,
      message: data.message,
      requestId: data.requestId ?? null,
      status: data.status,
      error: data.error ?? null,
      saleId: data.saleId ?? null,
      receiptNumber: data.receiptNumber ?? null,
    }).returning();
    return row;
  }

  async getSmsLogs(limit = 200): Promise<SmsLog[]> {
    return db.select().from(smsLogs).orderBy(desc(smsLogs.createdAt)).limit(limit);
  }

  async getSmsStats(): Promise<{ total: number; sent: number; failed: number }> {
    const result = await db.select({
      total: sql<number>`count(*)`,
      sent: sql<number>`count(*) filter (where ${smsLogs.status} = 'sent')`,
      failed: sql<number>`count(*) filter (where ${smsLogs.status} = 'failed')`,
    }).from(smsLogs);
    return {
      total: Number(result[0]?.total ?? 0),
      sent: Number(result[0]?.sent ?? 0),
      failed: Number(result[0]?.failed ?? 0),
    };
  }
}

export const storage = new DbStorage();
