import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

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

function buildPrintHTML(data: InvoiceData): string {
  const businessName = data.businessName || "Undergraduate Hub";
  const receiptFooter = data.receiptFooter || "Thank you for your business!";
  const discountAmount =
    data.discountType === "percentage"
      ? (data.subtotal * data.discount) / 100
      : data.discount;

  // Absolute URL so the isolated print window can load the logo
  const logoUrl = `${window.location.origin}/ug-hub-logo.png`;

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td class="item-name">${item.name}</td>
        <td class="mono">${item.stockCode}</td>
        <td class="right mono">${item.quantity}</td>
        <td class="right mono">৳${item.unitPrice.toFixed(2)}</td>
        <td class="right mono bold">৳${item.subtotal.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${data.invoiceNumber} — Undergraduate Hub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #111;
      background: #fff;
      padding: 40px;
    }

    .page { max-width: 760px; margin: 0 auto; }

    /* ── Top brand bar ── */
    .brand-bar {
      background: #1e3a8a;
      margin: -40px -40px 0 -40px;
      padding: 14px 40px;
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 32px;
    }
    .brand-bar img {
      height: 40px;
      width: 40px;
      object-fit: contain;
      border-radius: 6px;
      background: #fff;
      padding: 3px;
    }
    .brand-bar-text { color: #fff; }
    .brand-bar-text .biz { font-size: 16px; font-weight: 700; letter-spacing: 0.01em; }
    .brand-bar-text .sub { font-size: 11px; opacity: 0.75; }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }

    .header-left h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
      color: #1e3a8a;
    }

    .header-right { text-align: right; }

    .header-right .label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #888;
    }

    .header-right .receipt-num {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: 700;
      color: #111;
    }

    .header-right .date-val {
      font-size: 13px;
      font-weight: 500;
      color: #333;
    }

    hr {
      border: none;
      border-top: 2px solid #1e3a8a;
      margin: 20px 0;
      opacity: 0.15;
    }

    /* ── Parties ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }

    .party-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1e3a8a;
      margin-bottom: 6px;
    }

    .party-name { font-size: 15px; font-weight: 600; color: #111; }
    .party-detail { font-size: 12px; color: #666; margin-top: 2px; }

    /* ── Items table ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }

    thead tr { border-bottom: 2px solid #1e3a8a; }

    thead th {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1e3a8a;
      padding: 10px 8px;
      text-align: left;
    }

    thead th.right { text-align: right; }

    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: 1px solid #e2e8f0; }

    tbody td {
      padding: 12px 8px;
      color: #222;
      vertical-align: middle;
    }

    .item-name { font-weight: 500; }
    .mono { font-family: 'Courier New', monospace; font-size: 12px; color: #555; }
    .right { text-align: right; }
    .bold { font-weight: 700; color: #111; }

    /* ── Totals ── */
    .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { width: 280px; }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 13px;
      color: #555;
    }

    .totals-row .mono { color: #333; }
    .totals-row.discount { color: #c53030; }

    .totals-divider { border-top: 1px solid #e2e8f0; margin: 6px 0; }

    .totals-row.grand-total {
      font-size: 17px;
      font-weight: 700;
      color: #1e3a8a;
      padding-top: 8px;
    }

    .totals-row.payment { font-size: 12px; color: #666; margin-top: 4px; }

    .payment-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1e40af;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 2px solid #1e3a8a;
      border-top-style: solid;
      border-image: linear-gradient(to right, transparent, #1e3a8a, transparent) 1;
    }

    .footer-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .footer-logo img {
      height: 24px;
      width: 24px;
      object-fit: contain;
    }

    .footer-biz {
      font-size: 13px;
      font-weight: 700;
      color: #1e3a8a;
    }

    .footer-msg { font-size: 13px; font-weight: 500; color: #444; margin-bottom: 4px; }
    .footer-legal { font-size: 11px; color: #aaa; }
    .footer-powered {
      font-size: 10px;
      color: #bbb;
      margin-top: 6px;
      letter-spacing: 0.04em;
    }

    @media print {
      body { padding: 0; }
      .brand-bar { margin: 0 0 32px 0; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Brand bar -->
    <div class="brand-bar">
      <img src="${logoUrl}" alt="Undergraduate Hub" />
      <div class="brand-bar-text">
        <div class="biz">UNDERGRADUATE HUB</div>
        <div class="sub">Saga Inventory Management System</div>
      </div>
    </div>

    <!-- Invoice header -->
    <div class="header">
      <div class="header-left">
        <h1>INVOICE</h1>
      </div>
      <div class="header-right">
        <div class="label">Invoice Number</div>
        <div class="receipt-num">${data.invoiceNumber}</div>
        <div class="label" style="margin-top:10px;">Date</div>
        <div class="date-val">${format(data.date, "MMMM dd, yyyy")}</div>
      </div>
    </div>

    <hr />

    <div class="parties">
      <div>
        <div class="party-label">Bill To</div>
        <div class="party-name">${data.customerName}</div>
        ${data.customerEmail ? `<div class="party-detail">${data.customerEmail}</div>` : ""}
        ${data.customerPhone ? `<div class="party-detail">${data.customerPhone}</div>` : ""}
      </div>
      <div>
        <div class="party-label">Prepared By</div>
        <div class="party-name">${data.sellerName}</div>
        <div class="party-detail">${businessName}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Stock Code</th>
          <th class="right">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span class="mono">৳${data.subtotal.toFixed(2)}</span>
        </div>
        ${
          data.discount > 0
            ? `<div class="totals-row discount">
                <span>Discount ${data.discountType === "percentage" ? `(${data.discount}%)` : ""}</span>
                <span class="mono">-৳${discountAmount.toFixed(2)}</span>
               </div>`
            : ""
        }
        <div class="totals-divider"></div>
        <div class="totals-row grand-total">
          <span>Total</span>
          <span>৳${data.total.toFixed(2)}</span>
        </div>
        <div class="totals-row payment">
          <span>Payment Method</span>
          <span class="payment-badge">${data.paymentMethod}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-logo">
        <img src="${logoUrl}" alt="" />
        <span class="footer-biz">UNDERGRADUATE HUB</span>
      </div>
      <div class="footer-msg">${receiptFooter}</div>
      <div class="footer-legal">This is a computer-generated invoice and does not require a signature.</div>
      <div class="footer-powered">Powered by Saga Inventory</div>
    </div>

  </div>
</body>
</html>`;
}

export function Invoice({ data }: InvoiceProps) {
  const businessName = data.businessName || "Undergraduate Hub";
  const receiptFooter = data.receiptFooter || "Thank you for your business!";

  const discountAmount =
    data.discountType === "percentage"
      ? (data.subtotal * data.discount) / 100
      : data.discount;

  const handlePrint = () => {
    const html = buildPrintHTML(data);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  };

  const handleDownload = () => {
    const html = buildPrintHTML(data);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${data.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={handlePrint} data-testid="button-print-invoice">
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>
        <Button variant="outline" onClick={handleDownload} data-testid="button-download-invoice">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      {/* On-screen preview */}
      <div className="bg-white text-gray-900 rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Brand bar */}
        <div className="bg-[#1e3a8a] px-8 py-4 flex items-center gap-4">
          <img
            src="/ug-hub-logo.png"
            alt="Undergraduate Hub"
            className="h-10 w-10 object-contain bg-white rounded-md p-1 flex-shrink-0"
          />
          <div>
            <p className="text-white font-bold text-base tracking-wide">UNDERGRADUATE HUB</p>
            <p className="text-blue-200 text-xs">Saga Inventory Management System</p>
          </div>
        </div>

        <div className="p-8">
          {/* Invoice header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#1e3a8a]">INVOICE</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Invoice Number</p>
              <p className="font-mono text-xl font-bold text-gray-900" data-testid="text-invoice-number">
                {data.invoiceNumber}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">Date</p>
              <p className="font-medium text-gray-800" data-testid="text-invoice-date">
                {format(data.date, "MMMM dd, yyyy")}
              </p>
            </div>
          </div>

          <div className="border-t-2 border-[#1e3a8a] opacity-20 mb-6" />

          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1e3a8a] mb-2">Bill To</p>
              <p className="font-semibold text-gray-900 text-base" data-testid="text-customer-name">
                {data.customerName}
              </p>
              {data.customerEmail && (
                <p className="text-sm text-gray-500 mt-0.5">{data.customerEmail}</p>
              )}
              {data.customerPhone && (
                <p className="text-sm text-gray-500">{data.customerPhone}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1e3a8a] mb-2">Prepared By</p>
              <p className="font-semibold text-gray-900 text-base" data-testid="text-seller-name">
                {data.sellerName}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{businessName}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 mb-6" />

          {/* Items table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-[#1e3a8a]">
                <th className="text-left py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#1e3a8a] pr-4">Item</th>
                <th className="text-left py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#1e3a8a]">Code</th>
                <th className="text-right py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#1e3a8a]">Qty</th>
                <th className="text-right py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#1e3a8a]">Unit Price</th>
                <th className="text-right py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#1e3a8a]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-900 pr-4">{item.name}</td>
                  <td className="py-3 font-mono text-xs text-gray-400">{item.stockCode}</td>
                  <td className="py-3 text-right font-mono text-sm text-gray-700">{item.quantity}</td>
                  <td className="py-3 text-right font-mono text-sm text-gray-700">
                    ৳{item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-mono text-sm font-bold text-gray-900">
                    ৳{item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">৳{data.subtotal.toFixed(2)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>
                    Discount{data.discountType === "percentage" ? ` (${data.discount}%)` : ""}
                  </span>
                  <span className="font-mono">-৳{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold text-[#1e3a8a]">
                <span>Total</span>
                <span className="font-mono" data-testid="text-invoice-total">
                  ৳{data.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pt-1">
                <span>Payment Method</span>
                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold capitalize">
                  {data.paymentMethod}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/ug-hub-logo.png" alt="" className="h-6 w-6 object-contain opacity-80" />
              <span className="text-sm font-bold text-[#1e3a8a]">UNDERGRADUATE HUB</span>
            </div>
            <p className="text-sm font-medium text-gray-600">{receiptFooter}</p>
            <p className="text-xs text-gray-400 mt-1">
              This is a computer-generated invoice and does not require a signature.
            </p>
            <p className="text-[10px] text-gray-300 mt-1 tracking-wide">Powered by Saga Inventory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
