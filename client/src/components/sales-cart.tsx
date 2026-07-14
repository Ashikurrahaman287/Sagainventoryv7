import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface CartItem {
  id: string;
  stockCode: string;
  name: string;
  price: number;
  quantity: number;
  availableStock: number;
}

interface SalesCartProps {
  items: CartItem[];
  onQuantityChange: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  discountType: "percentage" | "fixed";
  onDiscountTypeChange: (type: "percentage" | "fixed") => void;
}

export function SalesCart({
  items,
  onQuantityChange,
  onRemoveItem,
  discount,
  onDiscountChange,
  discountType,
  onDiscountTypeChange,
}: SalesCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount =
    discountType === "percentage" ? (subtotal * discount) / 100 : discount;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cart ({items.length} items)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No items in cart
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/30"
                  data-testid={`cart-item-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {item.stockCode}
                    </div>
                    <div className="text-sm font-mono mt-1">
                      ৳{item.price.toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onQuantityChange(item.id, Math.max(1, item.quantity - 1))
                      }
                      disabled={item.quantity <= 1}
                      data-testid={`button-decrease-${item.id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        onQuantityChange(item.id, parseInt(e.target.value) || 1)
                      }
                      className="h-7 w-12 text-center"
                      min={1}
                      max={item.availableStock}
                      data-testid={`input-quantity-${item.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onQuantityChange(
                          item.id,
                          Math.min(item.availableStock, item.quantity + 1)
                        )
                      }
                      disabled={item.quantity >= item.availableStock}
                      data-testid={`button-increase-${item.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onRemoveItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label>Discount</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="flex-1"
                    data-testid="input-discount"
                  />
                  <Button
                    variant={discountType === "percentage" ? "default" : "outline"}
                    onClick={() => onDiscountTypeChange("percentage")}
                    className="w-16"
                    data-testid="button-discount-percentage"
                  >
                    %
                  </Button>
                  <Button
                    variant={discountType === "fixed" ? "default" : "outline"}
                    onClick={() => onDiscountTypeChange("fixed")}
                    className="w-16"
                    data-testid="button-discount-fixed"
                  >
                    ৳
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono" data-testid="text-subtotal">
                    ৳{subtotal.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount:</span>
                    <span className="font-mono" data-testid="text-discount-amount">
                      -৳{discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="font-mono" data-testid="text-total">
                    ৳{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
