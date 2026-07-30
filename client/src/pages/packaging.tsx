import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Box,
  CheckCircle2,
  User,
  Receipt,
  MapPin,
  Clock,
  Package,
  CalendarDays,
  AlarmClock,
  ShoppingBag,
  Coins,
} from "lucide-react";
import type { Sale, SaleItem } from "@shared/schema";

type PackagingOrder = Sale & {
  customerName: string;
  sellerName: string;
  items: SaleItem[];
};

const fmt = (v: string | number) =>
  "৳" + Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Packaging() {
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<PackagingOrder[]>({
    queryKey: ["/api/packaging"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/packaging");
      return res.json();
    },
  });

  const markPackedMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/packaging/${id}/packed`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packaging"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Order packed! 📦",
        description: "Order has been moved to the Delivery queue.",
      });
    },
    onError: (e: any) => {
      toast({ title: "Failed to mark as packed", description: e.message, variant: "destructive" });
    },
  });

  const totalPackagingCost = orders.reduce(
    (sum, o) => sum + Number(o.packagingCost ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Box className="h-8 w-8 text-amber-500" />
          Packaging
        </h1>
        <p className="text-muted-foreground">Internal packaging queue — orders awaiting packing before dispatch</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Pending Packing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders.reduce((sum, o) => sum + o.items.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Items to Pack</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{fmt(totalPackagingCost)}</p>
                <p className="text-sm text-muted-foreground">Total Packaging Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading packaging queue…</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Box className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-30" />
            <p className="text-lg font-medium text-muted-foreground">No orders pending packaging</p>
            <p className="text-sm text-muted-foreground mt-1">New confirmed orders will appear here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="border-amber-200/60 dark:border-amber-800/40 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
            >
              <CardContent className="py-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  {/* Left: order info */}
                  <div className="flex-1 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary text-sm">
                        {order.receiptNumber}
                      </span>
                      <Badge variant="warning" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Packaging
                      </Badge>
                    </div>

                    {/* Meta row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-medium text-foreground">{order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Receipt className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          Total: <span className="font-semibold text-foreground">{fmt(order.total)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{format(new Date(order.createdAt), "dd MMM yyyy, h:mm a")}</span>
                      </div>
                      {order.deliveryDate && (
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                          <AlarmClock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            Deliver: {order.deliveryDate}
                            {order.deliveryTime && ` at ${order.deliveryTime}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Delivery address */}
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400">{order.deliveryAddress}</span>
                      </div>
                    )}

                    {/* Internal-only packaging cost */}
                    {order.packagingCost && Number(order.packagingCost) > 0 && (
                      <div className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md px-3 py-1.5 text-sm">
                        <Coins className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-purple-700 dark:text-purple-300">
                          Packaging Cost (internal): <strong>{fmt(order.packagingCost)}</strong>
                        </span>
                      </div>
                    )}

                    {/* Items to pack */}
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Items to Pack
                      </p>
                      <div className="space-y-1.5">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-medium">{item.productName}</span>
                              <span className="ml-2 text-xs text-muted-foreground font-mono">
                                {item.stockCode}
                              </span>
                            </div>
                            <Badge variant="secondary" className="font-mono">
                              × {item.quantity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: action button */}
                  <div className="flex-shrink-0 flex items-center lg:items-start">
                    <Button
                      onClick={() => markPackedMutation.mutate(order.id)}
                      disabled={markPackedMutation.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 w-full lg:w-auto"
                      size="default"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Done — Mark as Packed
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
