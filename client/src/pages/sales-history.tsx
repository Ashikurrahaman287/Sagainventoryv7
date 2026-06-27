import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Receipt } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);

  const { data: sales = [], isLoading } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
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
    setSelectedSaleId(id);
    setLoadingDetail(true);
    setShowInvoice(true);
    try {
      const res = await apiRequest("GET", `/api/sales/${id}`);
      const data = await res.json();
      setSaleDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalRevenue = filteredSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
  const totalTransactions = filteredSales.length;

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
      <div>
        <h1 className="text-3xl font-bold">Sales History</h1>
        <p className="text-muted-foreground">Browse all past transactions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Transactions</div>
            <div className="text-3xl font-bold font-mono mt-1" data-testid="text-total-transactions">
              {totalTransactions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Revenue (filtered)</div>
            <div className="text-3xl font-bold font-mono mt-1 text-success" data-testid="text-total-revenue">
              ${totalRevenue.toFixed(2)}
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
                      <div className="font-mono font-bold">${parseFloat(sale.total).toFixed(2)}</div>
                      {parseFloat(sale.discount) > 0 && (
                        <div className="text-xs text-muted-foreground">
                          -{sale.discountType === "percentage" ? `${sale.discount}%` : `$${parseFloat(sale.discount).toFixed(2)}`} off
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
    </div>
  );
}
