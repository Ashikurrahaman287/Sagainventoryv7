import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Calendar, GraduationCap, Trophy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

interface StockReport {
  category: string;
  products: number;
  value: number;
  status: 'healthy' | 'low';
}

interface SalesReport {
  transactions: number;
  revenue: number;
  profit: number;
}

interface CustomerReport {
  name: string;
  purchases: number;
  spent: number;
}

interface UniversityReport {
  university: string;
  salesCount: number;
  revenue: number;
}

function ProfitCards() {
  const { data: todayData, isLoading: loadingToday } = useQuery<SalesReport>({
    queryKey: ["/api/reports/sales", "today"],
    queryFn: async () => {
      const response = await fetch(`/api/reports/sales?period=today`);
      if (!response.ok) throw new Error("Failed to fetch sales data");
      return response.json();
    },
  });

  const { data: weekData, isLoading: loadingWeek } = useQuery<SalesReport>({
    queryKey: ["/api/reports/sales", "week"],
    queryFn: async () => {
      const response = await fetch(`/api/reports/sales?period=week`);
      if (!response.ok) throw new Error("Failed to fetch sales data");
      return response.json();
    },
  });

  const { data: monthData, isLoading: loadingMonth } = useQuery<SalesReport>({
    queryKey: ["/api/reports/sales", "month"],
    queryFn: async () => {
      const response = await fetch(`/api/reports/sales?period=month`);
      if (!response.ok) throw new Error("Failed to fetch sales data");
      return response.json();
    },
  });

  const profitData = [
    { label: "Today's Profit", value: "today", data: todayData, isLoading: loadingToday },
    { label: "Weekly Profit", value: "week", data: weekData, isLoading: loadingWeek },
    { label: "Monthly Profit", value: "month", data: monthData, isLoading: loadingMonth },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {profitData.map((period) => (
        <Card key={period.value}>
          <CardHeader>
            <CardTitle className="text-base">{period.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {period.isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : period.data ? (
              <>
                <div className="text-3xl font-bold font-mono text-success" data-testid={`profit-${period.value}`}>
                  ৳{period.data.profit.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  From {period.data.transactions} transactions
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState("today");
  const [activeTab, setActiveTab] = useState("stock");
  const { toast } = useToast();

  const { data: stockData, isLoading: isLoadingStock } = useQuery<StockReport[]>({
    queryKey: ["/api/reports/stock"],
  });

  const { data: salesData, isLoading: isLoadingSales } = useQuery<SalesReport>({
    queryKey: ["/api/reports/sales", period],
    queryFn: async () => {
      const response = await fetch(`/api/reports/sales?period=${period}`);
      if (!response.ok) throw new Error("Failed to fetch sales data");
      return response.json();
    },
  });

  const { data: topCustomers, isLoading: isLoadingCustomers } = useQuery<CustomerReport[]>({
    queryKey: ["/api/reports/customers"],
  });

  const { data: topUniversities, isLoading: isLoadingUniversities } = useQuery<UniversityReport[]>({
    queryKey: ["/api/universities/top"],
    queryFn: async () => {
      const res = await fetch("/api/universities/top?limit=15");
      if (!res.ok) throw new Error("Failed to load university data");
      return res.json();
    },
  });

  const periods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  const handleExport = () => {
    const periodLabel = periods.find(p => p.value === period)?.label || period;

    switch (activeTab) {
      case "stock":
        if (stockData && stockData.length > 0) {
          exportToCSV(
            stockData.map(s => ({
              category: s.category,
              products: s.products,
              value: s.value,
              status: s.status,
            })),
            `stock_report_${period}`,
            [
              { key: "category", label: "Category" },
              { key: "products", label: "Products" },
              { key: "value", label: "Value" },
              { key: "status", label: "Status" },
            ]
          );
          toast({ title: "Stock report exported successfully" });
        } else {
          toast({ title: "No data to export", variant: "destructive" });
        }
        break;

      case "sales":
        if (salesData) {
          exportToCSV(
            [{
              period: periodLabel,
              transactions: salesData.transactions,
              revenue: salesData.revenue,
              profit: salesData.profit,
            }],
            `sales_report_${period}`,
            [
              { key: "period", label: "Period" },
              { key: "transactions", label: "Transactions" },
              { key: "revenue", label: "Revenue" },
              { key: "profit", label: "Profit" },
            ]
          );
          toast({ title: "Sales report exported successfully" });
        } else {
          toast({ title: "No data to export", variant: "destructive" });
        }
        break;

      case "profit":
        const profitExportData = [];
        if (salesData) {
          profitExportData.push({
            period: periodLabel,
            transactions: salesData.transactions,
            revenue: salesData.revenue,
            profit: salesData.profit,
          });
        }
        if (profitExportData.length > 0) {
          exportToCSV(
            profitExportData,
            `profit_report_${period}`,
            [
              { key: "period", label: "Period" },
              { key: "transactions", label: "Transactions" },
              { key: "revenue", label: "Revenue" },
              { key: "profit", label: "Profit" },
            ]
          );
          toast({ title: "Profit report exported successfully" });
        } else {
          toast({ title: "No data to export", variant: "destructive" });
        }
        break;

      case "customers":
        if (topCustomers && topCustomers.length > 0) {
          exportToCSV(
            topCustomers.map(c => ({
              name: c.name,
              purchases: c.purchases,
              spent: c.spent,
            })),
            `customer_report_${period}`,
            [
              { key: "name", label: "Customer Name" },
              { key: "purchases", label: "Purchases" },
              { key: "spent", label: "Total Spent" },
            ]
          );
          toast({ title: "Customer report exported successfully" });
        } else {
          toast({ title: "No data to export", variant: "destructive" });
        }
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your business
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stock" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="stock" data-testid="tab-stock">
            Stock Report
          </TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales">
            Sales Report
          </TabsTrigger>
          <TabsTrigger value="profit" data-testid="tab-profit">
            Profit Report
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers">
            Customer Report
          </TabsTrigger>
          <TabsTrigger value="universities" data-testid="tab-universities">
            <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
            By University
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Overview by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : stockData && stockData.length > 0 ? (
                <div className="space-y-4">
                  {stockData.map((item: any) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between p-4 rounded-md border"
                      data-testid={`stock-category-${item.category}`}
                    >
                      <div>
                        <div className="font-semibold">{item.category}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.products} products
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold" data-testid={`stock-value-${item.category}`}>
                          ৳{item.value.toFixed(2)}
                        </div>
                        <div
                          className={`text-sm ${
                            item.status === "healthy"
                              ? "text-success"
                              : "text-warning"
                          }`}
                        >
                          {item.status === "healthy" ? "Healthy" : "Low Stock"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No stock data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSales ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : salesData ? (
                <div className="space-y-4">
                  <div
                    className="flex items-center justify-between p-4 rounded-md border"
                    data-testid="sales-summary"
                  >
                    <div>
                      <div className="font-semibold">
                        {periods.find(p => p.value === period)?.label}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid="text-transactions">
                        {salesData.transactions} transactions
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-mono font-semibold" data-testid="text-revenue">
                        ৳{salesData.revenue.toFixed(2)}
                      </div>
                      <div className="text-sm text-success" data-testid="text-profit">
                        Profit: ৳{salesData.profit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No sales data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-6">
          <ProfitCards />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCustomers ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : topCustomers && topCustomers.length > 0 ? (
                <div className="space-y-4">
                  {topCustomers.map((customer: any, index: number) => (
                    <div
                      key={customer.name}
                      className="flex items-center justify-between p-4 rounded-md border"
                      data-testid={`customer-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold" data-testid={`customer-name-${index}`}>{customer.name}</div>
                          <div className="text-sm text-muted-foreground" data-testid={`customer-purchases-${index}`}>
                            {customer.purchases} purchases
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-semibold" data-testid={`customer-spent-${index}`}>
                        ৳{customer.spent.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No customer data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="universities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Universities by Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUniversities ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : topUniversities && topUniversities.length > 0 ? (
                <div className="space-y-3">
                  {topUniversities.map((uni, index) => (
                    <div
                      key={uni.university}
                      className="flex items-center justify-between p-4 rounded-md border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm
                          ${index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                            index === 1 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                            index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                            "bg-muted text-muted-foreground"}`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold leading-tight">{uni.university}</div>
                          <div className="text-sm text-muted-foreground">
                            {uni.salesCount} order{uni.salesCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-semibold">
                        ৳{uni.revenue.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No university data yet.</p>
                  <p className="text-sm mt-1">Select a university when creating a sale to start tracking.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
