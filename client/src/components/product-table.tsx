import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, PackagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@shared/schema";

interface ProductWithSupplier extends Product {
  supplierName?: string | null;
}

interface ProductTableProps {
  products: ProductWithSupplier[];
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onAdjustStock?: (id: string, quantity: number, type: 'add' | 'set') => void;
}

export function ProductTable({ products, onEdit, onDelete, onAdjustStock }: ProductTableProps) {
  const [adjustingProduct, setAdjustingProduct] = useState<ProductWithSupplier | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<'add' | 'set'>("add");

  const getStockStatus = (quantity: number, threshold = 20) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity < threshold) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  const handleAdjustConfirm = () => {
    if (!adjustingProduct) return;
    const qty = parseInt(adjustQty);
    if (isNaN(qty)) return;
    if (adjustType === 'add' && qty === 0) return;
    if (adjustType === 'set' && qty < 0) return;
    onAdjustStock?.(adjustingProduct.id, qty, adjustType);
    setAdjustingProduct(null);
    setAdjustQty("");
    setAdjustType("add");
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock Code</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Buy Price</TableHead>
              <TableHead className="text-right">Sell Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const status = getStockStatus(product.quantity);
                return (
                  <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                    <TableCell className="font-mono font-medium">
                      {product.stockCode}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right font-mono">
                      {product.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      ${parseFloat(product.buyingPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${parseFloat(product.sellingPrice).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {product.supplierName || (product.supplierId ? "Unknown" : "N/A")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Adjust Stock"
                          onClick={() => {
                            setAdjustingProduct(product);
                            setAdjustQty("");
                            setAdjustType("add");
                          }}
                          data-testid={`button-adjust-${product.id}`}
                        >
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(product)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(product.id)}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!adjustingProduct} onOpenChange={(open) => !open && setAdjustingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {adjustingProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              Current quantity: <span className="font-mono font-semibold">{adjustingProduct?.quantity}</span>
            </div>
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'set')}>
                <SelectTrigger data-testid="select-adjust-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add to stock (restock)</SelectItem>
                  <SelectItem value="set">Set exact quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-qty">
                {adjustType === 'add' ? 'Quantity to add' : 'New quantity'}
              </Label>
              <Input
                id="adjust-qty"
                type="number"
                min={adjustType === 'set' ? "0" : "1"}
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder={adjustType === 'add' ? "e.g. 50" : "e.g. 100"}
                data-testid="input-adjust-qty"
              />
              {adjustType === 'add' && adjustQty && !isNaN(parseInt(adjustQty)) && (
                <p className="text-sm text-muted-foreground">
                  New quantity will be: <span className="font-mono font-semibold">
                    {(adjustingProduct?.quantity ?? 0) + parseInt(adjustQty)}
                  </span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustingProduct(null)}>Cancel</Button>
            <Button
              onClick={handleAdjustConfirm}
              disabled={!adjustQty || isNaN(parseInt(adjustQty))}
              data-testid="button-confirm-adjust"
            >
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
