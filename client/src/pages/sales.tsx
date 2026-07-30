import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBar } from "@/components/search-bar";
import { SalesCart, CartItem } from "@/components/sales-cart";
import { PaymentMethodSelector, PaymentMethod } from "@/components/payment-method-selector";
import { Invoice } from "@/components/invoice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  ShoppingCart,
  MapPin,
  User,
  UserCog,
  CalendarDays,
  Clock,
  Box,
  DollarSign,
  Search,
  Sparkles,
} from "lucide-react";
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
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
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
      queryClient.invalidateQueries({ queryKey: ["/api/packaging"] });
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
      setDeliveryAddress("");
      setDeliveryDate("");
      setDeliveryTime("");
      setPackagingCost("");
      setAmountPaid("");

      toast({ title: "Sale completed! Order is now in packaging queue. 📦" });
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
    if (!deliveryAddress.trim()) {
      toast({ title: "Delivery address required", description: "Please enter a delivery address.", variant: "destructive" });
      return;
    }

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
      deliveryAddress: deliveryAddress.trim(),
      deliveryDate: deliveryDate || null,
      deliveryTime: deliveryTime || null,
      packagingCost: packagingCost.trim() ? parseFloat(packagingCost).toFixed(2) : null,
      amountPaid: amountPaid.trim() ? parseFloat(amountPaid).toFixed(2) : total.toFixed(2),
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
    cartItems.length > 0 && customer && seller && deliveryAddress.trim() && !createSaleMutation.isPending;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            New Sale
          </h1>
          <p className="text-muted-foreground mt-1">Create a new sales transaction</p>
        </div>
        {cartItems.length > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in cart
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: product search + cart */}
        <div className="xl:col-span-2 space-y-5">
          {/* Product Search */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4 text-muted-foreground" />
                Product Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SearchBar
                placeholder="Search by name or stock code…"
                value={search}
                onChange={setSearch}
                testId="input-search-sale-products"
              />

              {filteredProducts.length === 0 && search && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No products found for "{search}"
                </div>
              )}

              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                <AnimatePresence>
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-all group"
                      onClick={() => addToCart(product)}
                      data-testid={`product-item-${product.id}`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{product.stockCode}</span>
                          <span className="mx-1.5">·</span>
                          <span>{product.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <Badge variant={product.quantity < 20 ? "warning" : "success"} className="text-xs">
                          {product.quantity} left
                        </Badge>
                        <div className="font-mono font-semibold text-sm min-w-[80px] text-right">
                          ৳{parseFloat(product.sellingPrice).toFixed(2)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                          data-testid={`button-add-${product.id}`}
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <SalesCart
            items={cartItems}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={handleRemoveItem}
            discount={discount}
            onDiscountChange={setDiscount}
            discountType={discountType}
            onDiscountTypeChange={setDiscountType}
          />
        </div>

        {/* Right column: order details */}
        <div className="space-y-5">
          {/* Customer & Seller */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" />
                Order Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Customer <span className="text-destructive">*</span>
                </Label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger data-testid="select-customer" className="h-9">
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

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                  Seller <span className="text-destructive">*</span>
                </Label>
                <Select value={seller} onValueChange={setSeller}>
                  <SelectTrigger data-testid="select-seller" className="h-9">
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
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Delivery Address <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Enter the delivery address…"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                  data-testid="input-delivery-address"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    Delivery Date
                  </Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-9 text-sm"
                    data-testid="input-delivery-date"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Delivery Time
                  </Label>
                  <Input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="h-9 text-sm"
                    data-testid="input-delivery-time"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PaymentMethodSelector
                selected={paymentMethod}
                onSelect={setPaymentMethod}
              />

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Amount Paid
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(leave empty if fully paid)</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 500.00 for partial payment"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="h-9 text-sm"
                  data-testid="input-amount-paid"
                />
              </div>
            </CardContent>
          </Card>

          {/* Internal: Packaging Cost */}
          <Card className="border-purple-200/60 dark:border-purple-800/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Box className="h-4 w-4 text-purple-500" />
                Packaging Cost
                <Badge variant="outline" className="text-xs font-normal text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                  Internal only
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Packaging Cost (৳)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  className="h-9 text-sm border-purple-200 dark:border-purple-800 focus-visible:ring-purple-500"
                  data-testid="input-packaging-cost"
                />
                <p className="text-xs text-muted-foreground">
                  Never shown on receipts, emails, or customer-facing views.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order summary + complete */}
          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardContent className="pt-5 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">৳{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-500 dark:text-red-400">
                    <span>Discount ({discountType === "percentage" ? `${discount}%` : "Flat"})</span>
                    <span className="font-mono">−৳{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold text-primary">
                  <span>Total</span>
                  <span className="font-mono">৳{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full h-11 font-semibold text-base"
                disabled={!canCompleteSale}
                onClick={handleCompleteSale}
                data-testid="button-complete-sale"
              >
                {createSaleMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Complete Sale & Generate Invoice
                  </span>
                )}
              </Button>

              {!canCompleteSale && cartItems.length === 0 && (
                <p className="text-xs text-center text-muted-foreground">Add products to the cart to proceed</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice dialog */}
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
                deliveryAddress: (completedSale.sale as any).deliveryAddress,
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
