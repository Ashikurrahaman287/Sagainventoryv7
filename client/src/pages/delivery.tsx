import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, isToday, isTomorrow } from "date-fns";
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Receipt,
  BadgeDollarSign,
  CalendarDays,
  AlarmClock,
  Package,
  CalendarClock,
} from "lucide-react";
import type { Sale } from "@shared/schema";

type SaleWithDetails = Sale & {
  customerName: string;
  sellerName: string;
  deliveryAddress?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  amountPaid?: string | null;
  deliveredAt?: string | null;
};

const fmt = (v: string | number) =>
  "৳" + Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getDeliveryGroup(sale: SaleWithDetails): "today" | "tomorrow" | "upcoming" {
  if (!sale.deliveryDate) return "upcoming";
  const d = new Date(sale.deliveryDate + "T00:00:00");
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  return "upcoming";
}

export default function Delivery() {
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow" | "upcoming">("all");
  const [statusFilter, setStatusFilter] = useState<"pending" | "delivered">("pending");
  const [confirmSale, setConfirmSale] = useState<SaleWithDetails | null>(null);
  const [rescheduleSale, setRescheduleSale] = useState<SaleWithDetails | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const { toast } = useToast();

  const { data: allOrders = [], isLoading } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/delivery"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/delivery");
      return res.json();
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async ({ id, paymentReceived }: { id: string; paymentReceived: boolean }) => {
      const res = await apiRequest("PATCH", `/api/sales/${id}/deliver`, { paymentReceived });
      return res.json() as Promise<any>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setConfirmSale(null);

      if (!variables.paymentReceived) {
        toast({ title: "Delivery confirmed ✅", description: "Order marked as delivered." });
        return;
      }

      const emailResult = data?.emailResult;
      if (emailResult?.success) {
        toast({ title: "Delivery confirmed! ✅", description: "Payment & delivery emails sent." });
      } else {
        toast({
          title: "Delivery confirmed ✅ — Email failed ⚠️",
          description: emailResult?.error ?? "Marked as delivered, but email failed. Check Email Settings.",
          variant: "destructive",
        });
      }
    },
    onError: (e: any) => {
      toast({ title: "Failed to mark delivery", description: e.message, variant: "destructive" });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, deliveryDate, deliveryTime }: { id: string; deliveryDate: string | null; deliveryTime: string | null }) => {
      const res = await apiRequest("PATCH", `/api/delivery/${id}/reschedule`, { deliveryDate, deliveryTime });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setRescheduleSale(null);
      toast({ title: "Delivery rescheduled 📅", description: "The new date and time have been saved." });
    },
    onError: (e: any) => {
      toast({ title: "Reschedule failed", description: e.message, variant: "destructive" });
    },
  });

  const openReschedule = (sale: SaleWithDetails) => {
    setRescheduleSale(sale);
    setRescheduleDate(sale.deliveryDate ?? "");
    setRescheduleTime(sale.deliveryTime ?? "");
  };

  const pendingOrders = allOrders.filter((s) => s.orderStatus !== "delivered" && !s.deliveredAt);
  const deliveredOrders = allOrders.filter((s) => s.orderStatus === "delivered" || !!s.deliveredAt);
  const baseOrders = statusFilter === "pending" ? pendingOrders : deliveredOrders;
  const filtered = dateFilter === "all" ? baseOrders : baseOrders.filter((s) => getDeliveryGroup(s) === dateFilter);

  const todayCount = pendingOrders.filter((s) => getDeliveryGroup(s) === "today").length;
  const tomorrowCount = pendingOrders.filter((s) => getDeliveryGroup(s) === "tomorrow").length;
  const upcomingCount = pendingOrders.filter((s) => getDeliveryGroup(s) === "upcoming").length;

  const getOutstandingDue = (sale: SaleWithDetails) => {
    const total = Number(sale.total);
    const paid = sale.amountPaid != null ? Number(sale.amountPaid) : total;
    return Math.max(0, total - paid);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8" />
          Delivery Management
        </h1>
        <p className="text-muted-foreground">Track and confirm order deliveries</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today", count: todayCount, icon: Clock, color: "orange", filter: "today" as const },
          { label: "Tomorrow", count: tomorrowCount, icon: CalendarDays, color: "blue", filter: "tomorrow" as const },
          { label: "Upcoming", count: upcomingCount, icon: Package, color: "purple", filter: "upcoming" as const },
          { label: "Delivered", count: deliveredOrders.length, icon: CheckCircle2, color: "green", filter: null },
        ].map(({ label, count, icon: Icon, color, filter }) => (
          <Card
            key={label}
            className={`cursor-pointer transition-colors ${
              (filter ? dateFilter === filter && statusFilter === "pending" : statusFilter === "delivered")
                ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/20`
                : ""
            }`}
            onClick={() => {
              if (filter) { setStatusFilter("pending"); setDateFilter(filter); }
              else { setStatusFilter("delivered"); setDateFilter("all"); }
            }}
          >
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg`}>
                  <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setDateFilter("all"); }}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending <Badge variant="secondary" className="ml-2">{pendingOrders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered">
              Delivered <Badge variant="secondary" className="ml-2">{deliveredOrders.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {statusFilter === "pending" && (
          <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="today">
                Today {todayCount > 0 && <Badge variant="warning" className="ml-1">{todayCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
            <p className="text-muted-foreground">
              {statusFilter === "pending" ? "No pending deliveries — all caught up! 🎉" : "No delivered orders found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => {
            const outstanding = getOutstandingDue(sale);
            const isDelivered = sale.orderStatus === "delivered" || !!sale.deliveredAt;
            const group = getDeliveryGroup(sale);

            return (
              <Card key={sale.id} className={isDelivered ? "opacity-75" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-primary">{sale.receiptNumber}</span>
                        {isDelivered ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Delivered
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" /> Ready for Delivery
                          </Badge>
                        )}
                        {!isDelivered && sale.deliveryDate && (
                          <Badge
                            variant={group === "today" ? "destructive" : group === "tomorrow" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {group === "today" ? "🔴 Today" : group === "tomorrow" ? "🟡 Tomorrow" : "📅 Upcoming"}
                          </Badge>
                        )}
                        {outstanding > 0 && (
                          <Badge variant="destructive" className="text-xs">Due: {fmt(outstanding)}</Badge>
                        )}
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium text-foreground">{sale.customerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Receipt className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Total: <span className="font-semibold text-foreground">{fmt(sale.total)}</span></span>
                        </div>
                        {outstanding > 0 && (
                          <div className="flex items-center gap-1.5 text-destructive">
                            <BadgeDollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Outstanding: <span className="font-semibold">{fmt(outstanding)}</span></span>
                          </div>
                        )}
                        {sale.deliveryDate && (
                          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                            <AlarmClock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>
                              {sale.deliveryDate}
                              {sale.deliveryTime && ` at ${sale.deliveryTime}`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground sm:col-span-1">
                          <span>Ordered: {format(new Date(sale.createdAt), "dd MMM yyyy, h:mm a")}</span>
                        </div>
                      </div>

                      {/* Delivery address */}
                      {sale.deliveryAddress && (
                        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
                          <span className="text-blue-600 dark:text-blue-400">{sale.deliveryAddress}</span>
                        </div>
                      )}

                      {isDelivered && sale.deliveredAt && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          ✅ Delivered on {format(new Date(sale.deliveredAt), "dd MMM yyyy, h:mm a")}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isDelivered && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          onClick={() => setConfirmSale(sale)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          data-testid={`button-deliver-${sale.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Delivered
                        </Button>
                        <Button
                          onClick={() => openReschedule(sale)}
                          size="sm"
                          variant="outline"
                          className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          data-testid={`button-reschedule-${sale.id}`}
                        >
                          <CalendarClock className="h-4 w-4 mr-1" />
                          Reschedule
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm Delivery dialog */}
      <Dialog open={!!confirmSale} onOpenChange={(open) => !open && setConfirmSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Confirm Delivery — {confirmSale?.receiptNumber}
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-1">
              <span className="block">Customer: <strong>{confirmSale?.customerName}</strong></span>
              <span className="block">Order Total: <strong>{confirmSale ? fmt(confirmSale.total) : ""}</strong></span>
              {confirmSale && getOutstandingDue(confirmSale) > 0 && (
                <span className="block text-destructive font-medium">
                  Outstanding Due: {fmt(getOutstandingDue(confirmSale))}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4 text-center my-2">
            <p className="font-semibold text-base">Has the customer fully paid the outstanding amount?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Selecting <strong>Yes</strong> will confirm full payment and send the customer a payment confirmation + delivery email.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmSale(null)} disabled={deliverMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={deliverMutation.isPending}
              onClick={() => { if (confirmSale) deliverMutation.mutate({ id: confirmSale.id, paymentReceived: false }); }}
            >
              No — Mark Delivered Only
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={deliverMutation.isPending}
              onClick={() => { if (confirmSale) deliverMutation.mutate({ id: confirmSale.id, paymentReceived: true }); }}
            >
              {deliverMutation.isPending ? "Processing…" : "Yes — Payment Received ✅"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Delivery dialog */}
      <Dialog open={!!rescheduleSale} onOpenChange={(open) => !open && setRescheduleSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-500" />
              Reschedule Delivery — {rescheduleSale?.receiptNumber}
            </DialogTitle>
            <DialogDescription>
              Customer: <strong>{rescheduleSale?.customerName}</strong>
              {rescheduleSale?.deliveryDate && (
                <span className="block mt-1 text-muted-foreground">
                  Current schedule: {rescheduleSale.deliveryDate}
                  {rescheduleSale.deliveryTime && ` at ${rescheduleSale.deliveryTime}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                New Delivery Date
              </Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                New Delivery Time <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRescheduleSale(null)} disabled={rescheduleMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={rescheduleMutation.isPending || !rescheduleDate}
              onClick={() => {
                if (rescheduleSale) {
                  rescheduleMutation.mutate({
                    id: rescheduleSale.id,
                    deliveryDate: rescheduleDate || null,
                    deliveryTime: rescheduleTime || null,
                  });
                }
              }}
            >
              {rescheduleMutation.isPending ? "Saving…" : "Save New Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
