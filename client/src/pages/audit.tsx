import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Product, Sale, Customer, Supplier, Seller, OperationalCost } from "@shared/schema";
import {
  FileText, TrendingUp, Package, Users, ShoppingCart,
  Building2, DollarSign, BarChart3, Download, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const fmt = (n: number) =>
  "BDT " + n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBDT = (n: number) =>
  "৳" + n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface AuditSummary {
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  yearRevenue: number;
  yearProfit: number;
  yearTransactions: number;
  totalProducts: number;
  inventoryValue: number;
  inventoryCostValue: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalSellers: number;
  totalOpCosts: number;
  netProfit: number;
}

export default function Audit() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const { data: summary, isLoading: sumLoading } = useQuery<AuditSummary>({
    queryKey: ["/api/audit/summary"],
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery<
    Array<Sale & { customerName: string; sellerName: string }>
  >({ queryKey: ["/api/sales"] });

  const { data: products = [], isLoading: prodLoading } = useQuery<
    Array<Product & { supplierName?: string | null }>
  >({ queryKey: ["/api/products"] });

  const { data: customers = [], isLoading: custLoading } = useQuery<
    Array<Customer & { totalPurchases: number; totalSpent: number }>
  >({ queryKey: ["/api/customers"] });

  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: sellers = [] } = useQuery<Array<Seller & { totalSales: number; totalRevenue: number }>>({
    queryKey: ["/api/sellers"],
  });
  const { data: opCosts = [] } = useQuery<OperationalCost[]>({
    queryKey: ["/api/operational-costs"],
  });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 14;
      const colW = W - margin * 2;
      let y = 0;

      const newPage = () => {
        doc.addPage();
        y = 20;
      };

      const checkPage = (need = 20) => {
        if (y + need > 275) newPage();
      };

      // ── Cover ────────────────────────────────────────────────────────────
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, W, 55, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("UNDERGRADUATE HUB", W / 2, 22, { align: "center" });
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.text("Business Audit Report", W / 2, 33, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "dd MMMM yyyy, HH:mm")}`, W / 2, 43, { align: "center" });
      doc.text("CONFIDENTIAL", W / 2, 51, { align: "center" });

      doc.setTextColor(30, 30, 30);
      y = 65;

      const section = (title: string) => {
        checkPage(14);
        doc.setFillColor(240, 244, 255);
        doc.rect(margin, y, colW, 8, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text(title.toUpperCase(), margin + 3, y + 5.5);
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "normal");
        y += 12;
      };

      const row = (label: string, value: string, indent = 0) => {
        checkPage(8);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.text(label, margin + indent, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, W - margin, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setDrawColor(220, 220, 225);
        doc.line(margin, y + 1.5, W - margin, y + 1.5);
        y += 7.5;
      };

      const tableHeader = (cols: { label: string; x: number; align?: "left" | "right" }[]) => {
        checkPage(10);
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, colW, 7, "F");
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 100);
        cols.forEach((c) => doc.text(c.label, c.x, y + 5, { align: c.align || "left" }));
        doc.setTextColor(30, 30, 30);
        y += 9;
      };

      // ── Business Overview ────────────────────────────────────────────────
      section("Business Overview");
      if (summary) {
        row("Total Revenue (All Time)", fmt(summary.totalRevenue));
        row("Gross Profit (All Time)", fmt(summary.totalProfit));
        row("Total Operational Costs", fmt(summary.totalOpCosts));
        row("Net Profit", fmt(summary.netProfit));
        row("Total Transactions", String(summary.totalTransactions));
        row("This Year Revenue", fmt(summary.yearRevenue));
        row("This Year Profit", fmt(summary.yearProfit));
        row("Gross Margin %", summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) + "%" : "0%");
      }

      // ── Inventory Overview ───────────────────────────────────────────────
      section("Inventory Summary");
      if (summary) {
        row("Total Products", String(summary.totalProducts));
        row("Inventory Value (Selling)", fmt(summary.inventoryValue));
        row("Inventory Value (Cost)", fmt(summary.inventoryCostValue));
        row("Potential Profit on Stock", fmt(summary.inventoryValue - summary.inventoryCostValue));
      }

      // ── People ───────────────────────────────────────────────────────────
      section("People Summary");
      if (summary) {
        row("Total Customers", String(summary.totalCustomers));
        row("Total Suppliers", String(summary.totalSuppliers));
        row("Total Sellers / Staff", String(summary.totalSellers));
      }

      // ── Sales Transactions ───────────────────────────────────────────────
      section("Sales Transactions");
      if (sales.length === 0) {
        doc.setFontSize(9);
        doc.text("No sales recorded.", margin + 3, y);
        y += 8;
      } else {
        tableHeader([
          { label: "Receipt", x: margin + 2 },
          { label: "Customer", x: margin + 40 },
          { label: "Seller", x: margin + 90 },
          { label: "Date", x: margin + 130 },
          { label: "Total", x: W - margin - 2, align: "right" },
        ]);
        for (const s of sales.slice(0, 100)) {
          checkPage(7);
          doc.setFontSize(8.5);
          doc.text(s.receiptNumber, margin + 2, y);
          doc.text(s.customerName.slice(0, 25), margin + 40, y);
          doc.text(s.sellerName.slice(0, 20), margin + 90, y);
          doc.text(format(new Date(s.createdAt), "dd/MM/yy"), margin + 130, y);
          doc.setFont("helvetica", "bold");
          doc.text(fmt(Number(s.total)), W - margin - 2, y, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.setDrawColor(230, 230, 235);
          doc.line(margin, y + 1.5, W - margin, y + 1.5);
          y += 6.5;
        }
        if (sales.length > 100) {
          checkPage(8);
          doc.setFontSize(8.5);
          doc.setTextColor(120, 120, 140);
          doc.text(`... and ${sales.length - 100} more transactions`, margin + 2, y);
          doc.setTextColor(30, 30, 30);
          y += 8;
        }
      }

      // ── Products Inventory ───────────────────────────────────────────────
      section("Product Inventory");
      if (products.length === 0) {
        doc.setFontSize(9);
        doc.text("No products recorded.", margin + 3, y);
        y += 8;
      } else {
        tableHeader([
          { label: "Stock Code", x: margin + 2 },
          { label: "Product Name", x: margin + 35 },
          { label: "Category", x: margin + 100 },
          { label: "Qty", x: margin + 140 },
          { label: "Value", x: W - margin - 2, align: "right" },
        ]);
        for (const p of products.slice(0, 80)) {
          checkPage(7);
          doc.setFontSize(8.5);
          doc.text(p.stockCode, margin + 2, y);
          doc.text(p.name.slice(0, 36), margin + 35, y);
          doc.text(p.category.slice(0, 20), margin + 100, y);
          doc.text(String(p.quantity), margin + 140, y);
          doc.setFont("helvetica", "bold");
          doc.text(fmt(Number(p.sellingPrice) * p.quantity), W - margin - 2, y, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.setDrawColor(230, 230, 235);
          doc.line(margin, y + 1.5, W - margin, y + 1.5);
          y += 6.5;
        }
      }

      // ── Customers ────────────────────────────────────────────────────────
      section("Customer Directory");
      if (customers.length === 0) {
        doc.setFontSize(9);
        doc.text("No customers recorded.", margin + 3, y);
        y += 8;
      } else {
        tableHeader([
          { label: "Name", x: margin + 2 },
          { label: "Phone", x: margin + 65 },
          { label: "Purchases", x: margin + 118 },
          { label: "Total Spent", x: W - margin - 2, align: "right" },
        ]);
        for (const c of customers.slice(0, 60)) {
          checkPage(7);
          doc.setFontSize(8.5);
          doc.text(c.name.slice(0, 28), margin + 2, y);
          doc.text(c.phone, margin + 65, y);
          doc.text(String((c as any).totalPurchases || 0), margin + 118, y);
          doc.setFont("helvetica", "bold");
          doc.text(fmt(Number((c as any).totalSpent || 0)), W - margin - 2, y, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.setDrawColor(230, 230, 235);
          doc.line(margin, y + 1.5, W - margin, y + 1.5);
          y += 6.5;
        }
      }

      // ── Suppliers ────────────────────────────────────────────────────────
      section("Suppliers");
      if (suppliers.length === 0) {
        doc.setFontSize(9);
        doc.text("No suppliers recorded.", margin + 3, y);
        y += 8;
      } else {
        tableHeader([
          { label: "Name", x: margin + 2 },
          { label: "Phone", x: margin + 80 },
          { label: "Email", x: margin + 120 },
        ]);
        for (const s of suppliers) {
          checkPage(7);
          doc.setFontSize(8.5);
          doc.text(s.name.slice(0, 36), margin + 2, y);
          doc.text(s.phone, margin + 80, y);
          doc.text(s.email.slice(0, 30), margin + 120, y);
          doc.setDrawColor(230, 230, 235);
          doc.line(margin, y + 1.5, W - margin, y + 1.5);
          y += 6.5;
        }
      }

      // ── Operational Costs ────────────────────────────────────────────────
      section("Operational Costs");
      if (opCosts.length === 0) {
        doc.setFontSize(9);
        doc.text("No operational costs recorded.", margin + 3, y);
        y += 8;
      } else {
        tableHeader([
          { label: "Name", x: margin + 2 },
          { label: "Category", x: margin + 75 },
          { label: "Date", x: margin + 128 },
          { label: "Amount", x: W - margin - 2, align: "right" },
        ]);
        for (const c of opCosts) {
          checkPage(7);
          doc.setFontSize(8.5);
          doc.text(c.name.slice(0, 32), margin + 2, y);
          doc.text(c.category, margin + 75, y);
          doc.text(c.date, margin + 128, y);
          doc.setFont("helvetica", "bold");
          doc.text(fmt(Number(c.amount)), W - margin - 2, y, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.setDrawColor(230, 230, 235);
          doc.line(margin, y + 1.5, W - margin, y + 1.5);
          y += 6.5;
        }
        checkPage(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Total Operational Costs:", margin + 2, y);
        doc.text(fmt(opCosts.reduce((s, c) => s + Number(c.amount), 0)), W - margin - 2, y, { align: "right" });
        y += 10;
      }

      // ── Footer ───────────────────────────────────────────────────────────
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 170);
        doc.text(`Undergraduate Hub — Confidential Audit Report — Page ${i} of ${pageCount}`, W / 2, 290, { align: "center" });
      }

      doc.save(`UG-Hub-Audit-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "Audit report downloaded!" });
    } catch (err: any) {
      toast({ title: "PDF generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const isLoading = sumLoading || salesLoading || prodLoading || custLoading;

  const totalOpCostVal = opCosts.reduce((s, c) => s + Number(c.amount), 0);
  const grossMargin = summary && summary.totalRevenue > 0
    ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)
    : "0";

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Audit</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Complete snapshot of all business data and transactions
          </p>
        </div>
        <Button
          onClick={generatePDF}
          disabled={generating || isLoading}
          className="bg-blue-700 hover:bg-blue-800 text-white"
          data-testid="button-generate-audit"
        >
          {generating ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
          ) : (
            <><Download className="w-4 h-4 mr-2" /> Generate Audit Report</>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      {sumLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Total Revenue</span>
              </div>
              <div className="text-xl font-bold text-emerald-400" data-testid="audit-total-revenue">{fmtBDT(summary.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">{summary.totalTransactions} transactions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Gross Profit</span>
              </div>
              <div className="text-xl font-bold text-blue-400" data-testid="audit-gross-profit">{fmtBDT(summary.totalProfit)}</div>
              <div className="text-xs text-muted-foreground mt-1">{grossMargin}% gross margin</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-muted-foreground">Operational Costs</span>
              </div>
              <div className="text-xl font-bold text-orange-400" data-testid="audit-op-costs">{fmtBDT(summary.totalOpCosts)}</div>
              <div className="text-xs text-muted-foreground mt-1">{opCosts.length} expense entries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-muted-foreground">Net Profit</span>
              </div>
              <div className={`text-xl font-bold ${summary.netProfit >= 0 ? "text-purple-400" : "text-red-400"}`} data-testid="audit-net-profit">
                {fmtBDT(summary.netProfit)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">after all costs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-muted-foreground">Inventory Value</span>
              </div>
              <div className="text-xl font-bold text-cyan-400">{fmtBDT(summary.inventoryValue)}</div>
              <div className="text-xs text-muted-foreground mt-1">{summary.totalProducts} products</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-pink-400" />
                <span className="text-xs text-muted-foreground">Customers</span>
              </div>
              <div className="text-xl font-bold text-pink-400">{summary.totalCustomers}</div>
              <div className="text-xs text-muted-foreground mt-1">registered customers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Suppliers</span>
              </div>
              <div className="text-xl font-bold text-yellow-400">{summary.totalSuppliers}</div>
              <div className="text-xs text-muted-foreground mt-1">active suppliers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-muted-foreground">This Year</span>
              </div>
              <div className="text-xl font-bold text-indigo-400">{fmtBDT(summary.yearRevenue)}</div>
              <div className="text-xs text-muted-foreground mt-1">{summary.yearTransactions} transactions</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Transactions ({sales.length})
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Package className="w-3.5 h-3.5 mr-1" /> Inventory ({products.length})
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="w-3.5 h-3.5 mr-1" /> Customers ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">
            <Building2 className="w-3.5 h-3.5 mr-1" /> Suppliers ({suppliers.length})
          </TabsTrigger>
          <TabsTrigger value="sellers" data-testid="tab-sellers">
            <Users className="w-3.5 h-3.5 mr-1" /> Sellers ({sellers.length})
          </TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">
            <BarChart3 className="w-3.5 h-3.5 mr-1" /> Op. Costs ({opCosts.length})
          </TabsTrigger>
        </TabsList>

        {/* Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                All Sales Transactions
                <span className="text-sm font-normal text-muted-foreground">
                  Total: {fmtBDT(sales.reduce((s, x) => s + Number(x.total), 0))}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {salesLoading ? (
                <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : sales.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No sales recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Receipt</th>
                        <th className="text-left px-4 py-3">Customer</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Seller</th>
                        <th className="text-left px-4 py-3 hidden lg:table-cell">Payment</th>
                        <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                        <th className="text-right px-4 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s) => (
                        <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`row-sale-${s.id}`}>
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-400">{s.receiptNumber}</td>
                          <td className="px-4 py-2.5">{s.customerName}</td>
                          <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{s.sellerName}</td>
                          <td className="px-4 py-2.5 hidden lg:table-cell">
                            <Badge variant="outline" className="text-xs">{s.paymentMethod}</Badge>
                          </td>
                          <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">
                            {format(new Date(s.createdAt), "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmtBDT(Number(s.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Product Inventory
                <span className="text-sm font-normal text-muted-foreground">
                  Value: {fmtBDT(products.reduce((s, p) => s + Number(p.sellingPrice) * p.quantity, 0))}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {prodLoading ? (
                <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Stock Code</th>
                        <th className="text-left px-4 py-3">Product</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                        <th className="text-left px-4 py-3 hidden lg:table-cell">Supplier</th>
                        <th className="text-right px-4 py-3">Qty</th>
                        <th className="text-right px-4 py-3 hidden md:table-cell">Cost</th>
                        <th className="text-right px-4 py-3">Price</th>
                        <th className="text-right px-4 py-3">Stock Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`row-product-${p.id}`}>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.stockCode}</td>
                          <td className="px-4 py-2.5 font-medium">{p.name}</td>
                          <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{p.category}</td>
                          <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">{p.supplierName || "—"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge variant={p.quantity < 10 ? "destructive" : "outline"} className="text-xs">{p.quantity}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs hidden md:table-cell">{fmtBDT(Number(p.buyingPrice))}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmtBDT(Number(p.sellingPrice))}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmtBDT(Number(p.sellingPrice) * p.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer Directory</CardTitle></CardHeader>
            <CardContent className="p-0">
              {custLoading ? (
                <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Name</th>
                        <th className="text-left px-4 py-3">Phone</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
                        <th className="text-right px-4 py-3">Purchases</th>
                        <th className="text-right px-4 py-3">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`row-customer-${c.id}`}>
                          <td className="px-4 py-2.5 font-medium">{c.name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{c.phone}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{c.email}</td>
                          <td className="px-4 py-2.5 text-right">{(c as any).totalPurchases || 0}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmtBDT(Number((c as any).totalSpent || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader><CardTitle className="text-base">Supplier Directory</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Phone</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`row-supplier-${s.id}`}>
                        <td className="px-4 py-2.5 font-medium">{s.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.phone}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{s.email}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell text-xs">
                          {format(new Date(s.createdAt), "dd MMM yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sellers */}
        <TabsContent value="sellers">
          <Card>
            <CardHeader><CardTitle className="text-base">Sellers / Staff</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
                      <th className="text-right px-4 py-3">Sales Made</th>
                      <th className="text-right px-4 py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((s) => (
                      <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`row-seller-${s.id}`}>
                        <td className="px-4 py-2.5 font-medium">{s.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{s.email}</td>
                        <td className="px-4 py-2.5 text-right">{(s as any).totalSales || 0}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmtBDT(Number((s as any).totalRevenue || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Costs */}
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Operational Costs
                <span className="text-sm font-normal text-muted-foreground">
                  Total: {fmtBDT(totalOpCostVal)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {opCosts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No operational costs recorded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                        <th className="text-left px-4 py-3">Name</th>
                        <th className="text-left px-4 py-3">Category</th>
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="text-right px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opCosts.map((c) => (
                        <tr key={c.id} className="border-b border-border/30 hover:bg-muted/20" data-testid={`row-opcost-${c.id}`}>
                          <td className="px-4 py-2.5 font-medium">{c.name}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-xs">{c.category}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{c.date}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{c.description || "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmtBDT(Number(c.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
