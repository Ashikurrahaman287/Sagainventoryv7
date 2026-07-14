import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBar } from "@/components/search-bar";
import { SalesCart, CartItem } from "@/components/sales-cart";
import { PaymentMethodSelector, PaymentMethod } from "@/components/payment-method-selector";
import { Invoice } from "@/components/invoice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product, Customer, Seller, InsertSale, Sale, SaleItem } from "@shared/schema";

export default function Sales() {
  const [search, setSearch] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customer, setCustomer] = useState("");
  const [seller, setSeller] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    sale: Sale;
    items: SaleItem[];
    customerData: Customer;
    sellerData: Seller;
  } | null>(null);
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: sellers = [] } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: InsertSale) => apiRequest("POST", "/api/sales", data),
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/chart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/recent"] });

      const customerData = customers.find((c) => c.id === customer);
      const sellerData = sellers.find((s) => s.id === seller);
      if (customerData && sellerData) {
        setCompletedSale({ ...result, customerData, sellerData });
        setShowInvoice(true);
      }

      setCartItems([]);
      setDiscount(0);
      setCustomer("");
      setSeller("");

      toast({ title: "Sale completed successfully!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to complete sale", description: e.message, variant: "destructive" });
    },
  });

  const filteredProducts = products.filter(
    (product) =>
      product.quantity > 0 &&
      (product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.stockCode.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    const existing = cartItems.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCartItems((prev) =>
          prev.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      } else {
        toast({
          title: "Stock limit reached",
          description: `Only ${product.quantity} units available`,
          variant: "destructive",
        });
      }
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          id: product.id,
          stockCode: product.stockCode,
          name: product.name,
          price: parseFloat(product.sellingPrice),
          quantity: 1,
          availableStock: product.quantity,
        },
      ]);
    }
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    const item = cartItems.find((i) => i.id === id);
    if (item && quantity > item.availableStock) {
      toast({
        title: "Exceeds available stock",
        description: `Only ${item.availableStock} units available`,
        variant: "destructive",
      });
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCompleteSale = async () => {
    if (!customer || !seller || cartItems.length === 0) return;

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount =
      discountType === "percentage" ? (subtotal * discount) / 100 : discount;
    const total = Math.max(0, subtotal - discountAmount);

    const saleData: InsertSale = {
      customerId: customer,
      sellerId: seller,
      subtotal: subtotal.toFixed(2),
      discount: discount.toString(),
      discountType,
      total: total.toFixed(2),
      paymentMethod,
      items: cartItems.map((item) => {
        const product = products.find((p) => p.id === item.id);
        return {
          productId: item.id,
          productName: item.name,
          stockCode: item.stockCode,
          quantity: item.quantity,
          unitPrice: item.price.toFixed(2),
          buyingPrice: product?.buyingPrice ?? "0",
          subtotal: (item.price * item.quantity).toFixed(2),
        };
      }),
    };

    await createSaleMutation.mutateAsync(saleData);
  };

  const canCompleteSale =
    cartItems.length > 0 && customer && seller && !createSaleMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Sale</h1>
        <p className="text-muted-foreground">Create a new sales transaction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SearchBar
                placeholder="Search products..."
                value={search}
                onChange={setSearch}
                testId="input-search-sale-products"
              />

              {filteredProducts.length === 0 && search && (
                <div className="text-center py-6 text-muted-foreground">
                  No products found for "{search}"
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => addToCart(product)}
                    data-testid={`product-item-${product.id}`}
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono">{product.stockCode}</span> • {product.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={product.quantity < 20 ? "warning" : "success"}>
                        {product.quantity} left
                      </Badge>
                      <div className="font-mono font-semibold">
                        ৳{parseFloat(product.sellingPrice).toFixed(2)}
                      </div>
                      <Button size="sm" data-testid={`button-add-${product.id}`} onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <SalesCart
            items={cartItems}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={handleRemoveItem}
            discount={discount}
            onDiscountChange={setDiscount}
            discountType={discountType}
            onDiscountTypeChange={setDiscountType}
          />

          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Seller</Label>
                <Select value={seller} onValueChange={setSeller}>
                  <SelectTrigger data-testid="select-seller">
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <PaymentMethodSelector
                selected={paymentMethod}
                onSelect={setPaymentMethod}
              />

              <Button
                className="w-full"
                size="lg"
                disabled={!canCompleteSale}
                onClick={handleCompleteSale}
                data-testid="button-complete-sale"
              >
                {createSaleMutation.isPending
                  ? "Processing..."
                  : "Complete Sale & Generate Invoice"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Invoice</DialogTitle>
          </DialogHeader>
          {completedSale && (
            <Invoice
              data={{
                invoiceNumber: completedSale.sale.receiptNumber,
                date: new Date(completedSale.sale.createdAt),
                customerName: completedSale.customerData.name,
                customerEmail: completedSale.customerData.email,
                customerPhone: completedSale.customerData.phone,
                sellerName: completedSale.sellerData.name,
                businessName: settings?.businessName,
                receiptFooter: settings?.receiptFooter,
                items: completedSale.items.map((item) => ({
                  stockCode: item.stockCode,
                  name: item.productName,
                  quantity: item.quantity,
                  unitPrice: parseFloat(item.unitPrice),
                  subtotal: parseFloat(item.subtotal),
                })),
                subtotal: parseFloat(completedSale.sale.subtotal),
                discount: parseFloat(completedSale.sale.discount),
                discountType: completedSale.sale.discountType,
                total: parseFloat(completedSale.sale.total),
                paymentMethod: completedSale.sale.paymentMethod,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
