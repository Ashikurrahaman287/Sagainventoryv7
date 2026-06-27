import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sellerName: string;
  businessName?: string;
  receiptFooter?: string;
  items: {
    stockCode: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  discountType: string;
  total: number;
  paymentMethod: string;
}

interface InvoiceProps {
  data: InvoiceData;
}

export function Invoice({ data }: InvoiceProps) {
  const handlePrint = () => {
    window.print();
  };

  const businessName = data.businessName || "Saga Inventory";
  const receiptFooter = data.receiptFooter || "Thank you for your business!";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} data-testid="button-print-invoice">
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto p-8 print:shadow-none print:border-0">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold">INVOICE</h1>
              <p className="text-muted-foreground mt-2">{businessName}</p>
              <p className="text-sm text-muted-foreground">Inventory Management System</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Invoice Number</div>
              <div className="text-xl font-mono font-semibold" data-testid="text-invoice-number">
                {data.invoiceNumber}
              </div>
              <div className="text-sm text-muted-foreground mt-2">Date</div>
              <div className="font-medium" data-testid="text-invoice-date">
                {format(data.date, "MMMM dd, yyyy")}
              </div>
            </div>
          </div>

          <Separator />

          {/* Bill To / From */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">BILL TO</h3>
              <div className="space-y-1">
                <div className="font-semibold" data-testid="text-customer-name">
                  {data.customerName}
                </div>
                {data.customerEmail && (
                  <div className="text-sm text-muted-foreground">{data.customerEmail}</div>
                )}
                {data.customerPhone && (
                  <div className="text-sm text-muted-foreground">{data.customerPhone}</div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">PREPARED BY</h3>
              <div className="space-y-1">
                <div className="font-semibold" data-testid="text-seller-name">
                  {data.sellerName}
                </div>
                <div className="text-sm text-muted-foreground">{businessName}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-semibold text-sm">ITEM</th>
                  <th className="text-left py-3 font-semibold text-sm">STOCK CODE</th>
                  <th className="text-right py-3 font-semibold text-sm">QTY</th>
                  <th className="text-right py-3 font-semibold text-sm">UNIT PRICE</th>
                  <th className="text-right py-3 font-semibold text-sm">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-4">{item.name}</td>
                    <td className="py-4 font-mono text-sm text-muted-foreground">
                      {item.stockCode}
                    </td>
                    <td className="py-4 text-right font-mono">{item.quantity}</td>
                    <td className="py-4 text-right font-mono">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-4 text-right font-mono font-semibold">
                      ${item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">${data.subtotal.toFixed(2)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>
                    Discount {data.discountType === "percentage" ? `(${data.discount}%)` : ""}:
                  </span>
                  <span className="font-mono">
                    -${(data.discountType === "percentage"
                      ? (data.subtotal * data.discount) / 100
                      : data.discount
                    ).toFixed(2)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="font-mono" data-testid="text-invoice-total">
                  ${data.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="capitalize">{data.paymentMethod}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{receiptFooter}</p>
            <p className="text-xs text-muted-foreground">
              This is a computer-generated invoice and does not require a signature.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
