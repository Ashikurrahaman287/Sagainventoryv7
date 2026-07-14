import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProductTable } from "@/components/product-table";
import { ProductFormDialog } from "@/components/product-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, FileDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToCSV, downloadCSVTemplate } from "@/lib/export";
import { parseCSV, validateRequired, validateNumber, validateInteger } from "@/lib/import";
import type { InsertProduct, Supplier, Product } from "@shared/schema";

type ProductWithSupplier = Product & { supplierName?: string | null };

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<ProductWithSupplier[]>({
    queryKey: ["/api/products"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertProduct) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Product created successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to create product", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProduct> }) =>
      apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated successfully" });
      setEditingProduct(null);
    },
    onError: (e: any) => {
      toast({ title: "Failed to update product", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Product deleted successfully" });
      setDeletingProduct(null);
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete product", description: e.message, variant: "destructive" });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, quantity, type }: { id: string; quantity: number; type: "add" | "set" }) =>
      apiRequest("POST", `/api/products/${id}/adjust-stock`, { quantity, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      toast({ title: "Stock adjusted successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to adjust stock", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = async (data: InsertProduct) => {
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => setDeletingProduct(id);

  const confirmDelete = () => {
    if (deletingProduct) deleteMutation.mutate(deletingProduct);
  };

  const handleAdjustStock = (id: string, quantity: number, type: "add" | "set") => {
    adjustStockMutation.mutate({ id, quantity, type });
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (products.length === 0) {
      toast({ title: "No products to export", variant: "destructive" });
      return;
    }
    exportToCSV(
      products.map((p) => ({
        stockCode: p.stockCode,
        name: p.name,
        category: p.category,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice,
        quantity: p.quantity,
        supplier: p.supplierName || "",
      })),
      "products",
      [
        { key: "stockCode",    label: "Stock Code" },
        { key: "name",         label: "Product Name" },
        { key: "category",     label: "Category" },
        { key: "buyingPrice",  label: "Buying Price" },
        { key: "sellingPrice", label: "Selling Price" },
        { key: "quantity",     label: "Quantity" },
        { key: "supplier",     label: "Supplier" },
      ]
    );
    toast({ title: `${products.length} products exported successfully` });
  };

  // ── Template download ───────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    downloadCSVTemplate("products", [
      { label: "Stock Code",    example: "P001" },
      { label: "Product Name",  example: "Example Widget" },
      { label: "Category",      example: "Electronics" },
      { label: "Buying Price",  example: "10.00" },
      { label: "Selling Price", example: "25.00" },
      { label: "Quantity",      example: "50" },
      { label: "Supplier",      example: "Acme Corp" },
    ]);
    toast({ title: "Template downloaded" });
  };

  // ── Import ──────────────────────────────────────────────────────────────
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Please select a CSV file", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setImportProgress(null);

    try {
      // Build supplier name → id lookup (case-insensitive)
      const supplierMap = new Map<string, string>(
        suppliers.map((s) => [s.name.toLowerCase().trim(), s.id])
      );

      const result = await parseCSV<InsertProduct>(
        file,
        [
          { csvHeader: "Stock Code",    field: "stockCode" },
          { csvHeader: "Product Name",  field: "name" },
          { csvHeader: "Category",      field: "category" },
          { csvHeader: "Buying Price",  field: "buyingPrice" },
          { csvHeader: "Selling Price", field: "sellingPrice" },
          { csvHeader: "Quantity",      field: "quantity" },
          { csvHeader: "Supplier",      field: "supplierId", optional: true },
        ],
        (row) => {
          const supplierName = (row["Supplier"] || "").trim();
          const supplierId = supplierName
            ? (supplierMap.get(supplierName.toLowerCase()) ?? null)
            : null;

          return {
            stockCode:    validateRequired(row["Stock Code"],    "Stock Code"),
            name:         validateRequired(row["Product Name"],  "Product Name"),
            category:     validateRequired(row["Category"],      "Category"),
            buyingPrice:  validateNumber(row["Buying Price"],    "Buying Price"),
            sellingPrice: validateNumber(row["Selling Price"],   "Selling Price"),
            quantity:     validateInteger(row["Quantity"],       "Quantity"),
            supplierId,
          };
        }
      );

      // Show warnings (missing optional columns)
      if (result.warnings.length > 0) {
        toast({
          title: "Import note",
          description: result.warnings.join(". "),
        });
      }

      // Hard errors (missing required columns or all rows failed)
      if (result.errors.length > 0 && result.data.length === 0) {
        toast({
          title: "Import failed",
          description: result.errors.slice(0, 5).join(" | "),
          variant: "destructive",
        });
        return;
      }

      // Row-level parse errors — continue importing valid rows
      if (result.errors.length > 0) {
        toast({
          title: `${result.errors.length} row(s) skipped`,
          description: result.errors.slice(0, 3).join(", ") +
            (result.errors.length > 3 ? ` (+${result.errors.length - 3} more)` : ""),
          variant: "destructive",
        });
      }

      if (result.data.length === 0) {
        toast({ title: "No valid rows to import", variant: "destructive" });
        return;
      }

      // Batch-import valid rows
      let successCount = 0;
      const rowErrors: string[] = [];
      setImportProgress({ done: 0, total: result.data.length });

      for (let i = 0; i < result.data.length; i++) {
        const product = result.data[i];
        try {
          await apiRequest("POST", "/api/products", product);
          successCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          rowErrors.push(`${product.stockCode || `Row ${i + 2}`}: ${msg}`);
        }
        setImportProgress({ done: i + 1, total: result.data.length });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      if (rowErrors.length === 0) {
        toast({
          title: "Import successful",
          description: `${successCount} product${successCount !== 1 ? "s" : ""} imported`,
        });
      } else {
        toast({
          title: `Imported ${successCount}, failed ${rowErrors.length}`,
          description: rowErrors.slice(0, 3).join(", ") +
            (rowErrors.length > 3 ? ` (+${rowErrors.length - 3} more)` : ""),
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Filter ──────────────────────────────────────────────────────────────
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.stockCode.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || product.category === category;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading products...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            data-testid="button-download-template"
            title="Download a blank CSV template showing the correct column format"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Template
          </Button>
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isImporting}
            data-testid="button-import-products"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting
              ? importProgress
                ? `Importing ${importProgress.done}/${importProgress.total}…`
                : "Reading file…"
              : "Import CSV"}
          </Button>
          <Button variant="outline" onClick={handleExport} data-testid="button-export-products">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-product">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Search by name or stock code..."
            value={search}
            onChange={setSearch}
            testId="input-search-products"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredProducts.length} of {products.length} products
      </div>

      <ProductTable
        products={filteredProducts}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdjustStock={handleAdjustStock}
      />

      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct || undefined}
        suppliers={suppliers}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        onConfirm={confirmDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
      />
    </div>
  );
}
