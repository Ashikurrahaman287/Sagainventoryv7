import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Product } from "@shared/schema";

interface DashboardStats {
  totalProducts: number;
  todaysSales: number;
  lowStockCount: number;
  todaysProfit: number;
}

interface RecentSale {
  id: string;
  receiptNumber: string;
  customerName: string;
  sellerName: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
}

interface ChartPoint {
  date: string;
  sales: number;
  profit: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: lowStockProducts = [], isLoading: loadingLowStock } = useQuery<Product[]>({
    queryKey: ["/api/dashboard/low-stock"],
  });

  const { data: recentSales = [], isLoading: loadingRecent } = useQuery<RecentSale[]>({
    queryKey: ["/api/sales/recent"],
  });

  const { data: chartData = [] } = useQuery<ChartPoint[]>({
    queryKey: ["/api/dashboard/chart"],
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const paymentBadgeVariant = (method: string): "default" | "success" | "warning" | "secondary" => {
    if (method === "cash") return "success";
    if (method === "card") return "default";
    if (method === "transfer") return "warning";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your inventory and sales</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingStats ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard
              title="Total Products"
              value={stats?.totalProducts ?? 0}
              icon={Package}
              testId="card-total-products"
            />
            <StatCard
              title="Today's Sales"
              value={`$${(stats?.todaysSales ?? 0).toFixed(2)}`}
              icon={DollarSign}
              testId="card-todays-sales"
            />
            <StatCard
              title="Low Stock Alerts"
              value={stats?.lowStockCount ?? 0}
              icon={AlertTriangle}
              testId="card-low-stock"
            />
            <StatCard
              title="Profit Today"
              value={`$${(stats?.todaysProfit ?? 0).toFixed(2)}`}
              icon={TrendingUp}
              testId="card-profit"
            />
          </>
        )}
      </div>

      {/* Sales chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales & Profit — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === "sales" ? "Sales" : "Profit"]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#gradSales)"
                  name="sales"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--success, 142 76% 36%))"
                  strokeWidth={2}
                  fill="url(#gradProfit)"
                  name="profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Low stock + recent sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Low Stock Alerts</CardTitle>
            <Link href="/products">
              <Button variant="ghost" size="sm" data-testid="button-view-all-products">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingLowStock ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No low stock items
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    data-testid={`low-stock-item-${product.id}`}
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono">{product.stockCode}</span> • {product.category}
                      </div>
                    </div>
                    <Badge
                      variant={product.quantity === 0 ? "destructive" : "warning"}
                      data-testid={`badge-stock-${product.id}`}
                    >
                      {product.quantity === 0 ? "Out of Stock" : `${product.quantity} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>Recent Sales</CardTitle>
            <Link href="/sales/history">
              <Button variant="ghost" size="sm" data-testid="button-view-all-sales">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent sales
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    data-testid={`recent-sale-${sale.id}`}
                  >
                    <div>
                      <div className="font-medium">{sale.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono">{sale.receiptNumber}</span> • {formatTimeAgo(sale.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={paymentBadgeVariant(sale.paymentMethod)} className="capitalize">
                        {sale.paymentMethod}
                      </Badge>
                      <div className="font-mono font-semibold">
                        ${parseFloat(sale.total).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
