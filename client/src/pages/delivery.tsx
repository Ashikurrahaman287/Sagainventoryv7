import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { Truck, CheckCircle2, Clock, MapPin, User, Receipt, BadgeDollarSign } from "lucide-react";
import type { Sale } from "@shared/schema";

type SaleWithDetails = Sale & {
  customerName: string;
  sellerName: string;
  deliveryAddress?: string | null;
  amountPaid?: string | null;
  deliveredAt?: string | null;
};

const fmt = (v: string | number) =>
  "৳" + Number(v).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Delivery() {
  const [filter, setFilter] = useState<"all" | "pending" | "delivered">("pending");
  const [confirmSale, setConfirmSale] = useState<SaleWithDetails | null>(null);
  const { toast } = useToast();

  const { data: sales = [], isLoading } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

  const deliverMutation = useMutation({
    mutationFn: ({ id, paymentReceived }: { id: string; paymentReceived: boolean }) =>
      apiRequest("PATCH", `/api/sales/${id}/deliver`, { paymentReceived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setConfirmSale(null);
      toast({
        title: "Delivery confirmed! ✅",
        description: "Emails have been sent to the customer.",
      });
    },
    onError: (e: any) => {
      toast({ title: "Failed to mark delivery", description: e.message, variant: "destructive" });
    },
  });

  const filtered = sales.filter((s) => {
    if (filter === "pending") return !s.deliveredAt;
    if (filter === "delivered") return !!s.deliveredAt;
    return true;
  });

  const pendingCount = sales.filter((s) => !s.deliveredAt).length;
  const deliveredCount = sales.filter((s) => !!s.deliveredAt).length;

  const getOutstandingDue = (sale: SaleWithDetails) => {
    const total = Number(sale.total);
    const paid = sale.amountPaid !== null && sale.amountPaid !== undefined
      ? Number(sale.amountPaid)
      : total;
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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deliveredCount}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sales.length}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Delivered <Badge variant="secondary" className="ml-2">{deliveredCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
            <p className="text-muted-foreground">
              {filter === "pending" ? "No pending deliveries — all caught up! 🎉" : "No orders found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => {
            const outstanding = getOutstandingDue(sale);
            const isDelivered = !!sale.deliveredAt;

            return (
              <Card key={sale.id} className={isDelivered ? "opacity-75" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-primary">
                          {sale.receiptNumber}
                        </span>
                        {isDelivered ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Delivered
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        )}
                        {outstanding > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            Due: {fmt(outstanding)}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium text-foreground">{sale.customerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Receipt className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            Total: <span className="font-semibold text-foreground">{fmt(sale.total)}</span>
                          </span>
                        </div>
                        {outstanding > 0 && (
                          <div className="flex items-center gap-1.5 text-destructive">
                            <BadgeDollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Outstanding: <span className="font-semibold">{fmt(outstanding)}</span></span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span>
                            {format(new Date(sale.createdAt), "dd MMM yyyy, h:mm a")}
                          </span>
                        </div>
                      </div>

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

                    {/* Action */}
                    {!isDelivered && (
                      <Button
                        onClick={() => setConfirmSale(sale)}
                        size="sm"
                        className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white"
                        data-testid={`button-deliver-${sale.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Done
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={!!confirmSale} onOpenChange={(open) => !open && setConfirmSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Confirm Delivery — {confirmSale?.receiptNumber}
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-1">
              <span className="block">
                Customer: <strong>{confirmSale?.customerName}</strong>
              </span>
              <span className="block">
                Order Total: <strong>{confirmSale ? fmt(confirmSale.total) : ""}</strong>
              </span>
              {confirmSale && getOutstandingDue(confirmSale) > 0 && (
                <span className="block text-destructive font-medium">
                  Outstanding Due: {fmt(getOutstandingDue(confirmSale))}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted rounded-lg p-4 text-center my-2">
            <p className="font-semibold text-base">
              Has the customer fully paid the outstanding amount?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Selecting <strong>Yes</strong> will confirm full payment and send the customer a payment confirmation + delivery email.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmSale(null)}
              disabled={deliverMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={deliverMutation.isPending}
              onClick={() => {
                if (confirmSale) deliverMutation.mutate({ id: confirmSale.id, paymentReceived: false });
              }}
            >
              No — Mark Delivered Only
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={deliverMutation.isPending}
              onClick={() => {
                if (confirmSale) deliverMutation.mutate({ id: confirmSale.id, paymentReceived: true });
              }}
            >
              {deliverMutation.isPending ? "Processing…" : "Yes — Payment Received ✅"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
