import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

export interface ReceiptData {
  receiptNumber: string;
  date: Date;
  customerName: string;
  sellerName: string;
  items: {
    stockCode: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
}

interface ReceiptPreviewProps {
  data: ReceiptData;
}

export function ReceiptPreview({ data }: ReceiptPreviewProps) {
  return (
    <Card className="max-w-md mx-auto" data-testid="receipt-preview">
      <CardContent className="p-8 space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Saga Inventory</h2>
          <p className="text-sm text-muted-foreground">Inventory Management System</p>
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receipt #:</span>
            <span className="font-mono" data-testid="text-receipt-number">
              {data.receiptNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span data-testid="text-receipt-date">
              {format(data.date, "MMM dd, yyyy HH:mm")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer:</span>
            <span data-testid="text-customer-name">{data.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seller:</span>
            <span data-testid="text-seller-name">{data.sellerName}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Item</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-3 text-right">Price</div>
            <div className="col-span-3 text-right">Total</div>
          </div>
          {data.items.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-4">
                  <div className="truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {item.stockCode}
                  </div>
                </div>
                <div className="col-span-2 text-right font-mono">{item.quantity}</div>
                <div className="col-span-3 text-right font-mono">
                  ৳{item.unitPrice.toFixed(2)}
                </div>
                <div className="col-span-3 text-right font-mono font-medium">
                  ৳{item.subtotal.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-mono">৳{data.subtotal.toFixed(2)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Discount:</span>
              <span className="font-mono">-৳{data.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="capitalize">{data.paymentMethod}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="font-mono" data-testid="text-receipt-total">
              ৳{data.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4">
          Thank you for your business!
        </div>
      </CardContent>
    </Card>
  );
}
