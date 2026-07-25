import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";
import { Invoice } from "@/components/invoice";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, Receipt, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Sale, SaleItem } from "@shared/schema";

interface SaleWithDetails extends Sale {
  customerName: string;
  sellerName: string;
}

interface SaleDetail {
  sale: Sale & { customerName?: string; sellerName?: string; customerEmail?: string; customerPhone?: string };
  items: SaleItem[];
  customerName: string;
  sellerName: string;
}

const paymentMethodColors: Record<string, "default" | "success" | "warning" | "secondary"> = {
  cash: "success",
  card: "default",
  transfer: "warning",
  other: "secondary",
};

export default function SalesHistory() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [showInvoice, setShowInvoice] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  const { data: sales = [], isLoading } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const invalidateSales = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/chart"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/sales"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales/${id}`),
    onSuccess: () => {
      toast({ title: "Sale deleted", description: "The transaction has been removed." });
      invalidateSales();
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      setDeleteTargetId(null);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/sales/all"),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({
        title: "All sales cleared",
        description: `${data.deleted} transaction${data.deleted !== 1 ? "s" : ""} removed.`,
      });
      invalidateSales();
      setShowClearAll(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to clear", description: err.message, variant: "destructive" });
      setShowClearAll(false);
    },
  });

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(search.toLowerCase()) ||
      sale.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchesPayment = paymentFilter === "all" || sale.paymentMethod === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  const handleViewSale = async (id: string) => {
    setLoadingDetail(true);
    setShowInvoice(true);
    setSaleDetail(null);
    try {
      const res = await apiRequest("GET", `/api/sales/${id}`);
      const data = await res.json();
      setSaleDetail(data);
    } catch (e: any) {
      toast({ title: "Failed to load sale", description: e.message, variant: "destructive" });
      setShowInvoice(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalRevenue = filteredSales.reduce((sum, s) => sum + parseFloat(s.total), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sales History</h1>
          <p className="text-muted-foreground">Browse all past transactions</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales History</h1>
          <p className="text-muted-foreground">Browse and manage all past transactions</p>
        </div>
        {sales.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowClearAll(true)}
            data-testid="button-clear-all-sales"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Sales
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Transactions</div>
            <div className="text-3xl font-bold font-mono mt-1" data-testid="text-total-transactions">
              {filteredSales.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Revenue (filtered)</div>
            <div className="text-3xl font-bold font-mono mt-1 text-success" data-testid="text-total-revenue">
              ৳{totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Search by receipt, customer, or seller..."
            value={search}
            onChange={setSearch}
            testId="input-search-sales"
          />
        </div>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-48" data-testid="select-payment-filter">
            <SelectValue placeholder="Payment Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transactions ({filteredSales.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {sales.length === 0 ? "No sales recorded yet" : "No sales match your search"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 rounded-md border hover:bg-muted/30 transition-colors"
                  data-testid={`sale-row-${sale.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-mono font-semibold text-sm">{sale.receiptNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {sale.customerName} • Sold by {sale.sellerName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(sale.createdAt), "MMM dd, yyyy • h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={paymentMethodColors[sale.paymentMethod] || "default"} className="capitalize">
                      {sale.paymentMethod}
                    </Badge>
                    <div className="text-right">
                      <div className="font-mono font-bold">৳{parseFloat(sale.total).toFixed(2)}</div>
                      {parseFloat(sale.discount) > 0 && (
                        <div className="text-xs text-muted-foreground">
                          -{sale.discountType === "percentage" ? `${sale.discount}%` : `৳${parseFloat(sale.discount).toFixed(2)}`} off
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSale(sale.id)}
                      data-testid={`button-view-sale-${sale.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTargetId(sale.id)}
                      data-testid={`button-delete-sale-${sale.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice dialog */}
      <Dialog open={showInvoice} onOpenChange={(open) => { setShowInvoice(open); if (!open) setSaleDetail(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Invoice</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : saleDetail ? (
            <Invoice
              data={{
                invoiceNumber: saleDetail.sale.receiptNumber,
                date: new Date(saleDetail.sale.createdAt),
                customerName: saleDetail.customerName,
                customerEmail: (saleDetail.sale as any).customerEmail || "",
                customerPhone: (saleDetail.sale as any).customerPhone || "",
                sellerName: saleDetail.sellerName,
                businessName: settings?.businessName,
                receiptFooter: settings?.receiptFooter,
                items: saleDetail.items.map((item) => ({
                  stockCode: item.stockCode,
                  name: item.productName,
                  quantity: item.quantity,
                  unitPrice: parseFloat(item.unitPrice),
                  subtotal: parseFloat(item.subtotal),
                })),
                subtotal: parseFloat(saleDetail.sale.subtotal),
                discount: parseFloat(saleDetail.sale.discount),
                discountType: saleDetail.sale.discountType,
                total: parseFloat(saleDetail.sale.total),
                paymentMethod: saleDetail.sale.paymentMethod,
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete single sale confirmation */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Sale?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the transaction record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-sale"
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</>
              ) : (
                "Delete Sale"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear ALL confirmation */}
      <Dialog open={showClearAll} onOpenChange={(open) => { if (!open) setShowClearAll(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Sales?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all <strong>{sales.length}</strong> transaction records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearAll(false)} disabled={clearAllMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              data-testid="button-confirm-clear-all"
            >
              {clearAllMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Clearing…</>
              ) : (
                `Delete All ${sales.length} Sales`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
