import { eq, desc, sql, like, or, and, gte } from "drizzle-orm";
import { db, schema } from "./db";
import type {
  Supplier,
  Customer,
  Seller,
  Product,
  Sale,
  SaleItem,
  InsertSupplier,
  InsertCustomer,
  InsertSeller,
  InsertProduct,
  InsertSale,
  OperationalCost,
  InsertOperationalCost,
} from "@shared/schema";

const { suppliers, customers, sellers, products, sales, saleItems, settings, operationalCosts } = schema;

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
  deleteSale(id: string): Promise<boolean>;
  clearAllSales(): Promise<number>;

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
}

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
      amountPaid: sales.amountPaid,
      deliveredAt: sales.deliveredAt,
      createdAt: sales.createdAt,
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
        amountPaid: sales.amountPaid,
        deliveredAt: sales.deliveredAt,
        createdAt: sales.createdAt,
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

    // Validate stock for all items first
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

    // Create sale
    const saleResult = await db.insert(sales).values({
      ...saleInfo,
      receiptNumber,
    }).returning();
    const sale = saleResult[0];

    // Create sale items and update product quantities
    const items: SaleItem[] = [];
    for (const item of saleItemsData) {
      const itemResult = await db.insert(saleItems).values({
        ...item,
        saleId: sale.id,
      }).returning();
      items.push(itemResult[0]);

      // Decrease product quantity
      await db.update(products)
        .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    return { sale, items };
  }

  async markSaleDelivered(id: string, paymentReceived: boolean): Promise<Sale | undefined> {
    const updates: Partial<Sale> = { deliveredAt: new Date() } as any;
    if (paymentReceived) {
      const existing = await this.getSale(id);
      if (existing) {
        (updates as any).amountPaid = existing.total;
      }
    }
    const result = await db.update(sales).set(updates as any).where(eq(sales.id, id)).returning();
    return result[0];
  }

  async deleteSale(id: string): Promise<boolean> {
    await db.delete(saleItems).where(eq(saleItems.saleId, id));
    const result = await db.delete(sales).where(eq(sales.id, id)).returning();
    return result.length > 0;
  }

  async clearAllSales(): Promise<number> {
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
      amountPaid: sales.amountPaid,
      deliveredAt: sales.deliveredAt,
      createdAt: sales.createdAt,
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
}

export const storage = new DbStorage();
