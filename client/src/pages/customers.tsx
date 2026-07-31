import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CustomerList, Customer } from "@/components/customer-list";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { exportToCSV } from "@/lib/export";
import { parseCSV, validateRequired, validateEmail } from "@/lib/import";
import type { InsertCustomer } from "@shared/schema";

type CustomerWithStats = Customer & { totalPurchases: number; totalSpent: number };

export default function Customers() {
  const [search, setSearch] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery<CustomerWithStats[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCustomer) =>
      apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create customer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertCustomer> }) =>
      apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer updated successfully" });
      setEditingCustomer(null);
    },
    onError: () => {
      toast({ title: "Failed to update customer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted successfully" });
      setDeletingCustomer(null);
    },
    onError: () => {
      toast({ title: "Failed to delete customer", variant: "destructive" });
    },
  });

  const handleSubmit = async (data: InsertCustomer) => {
    if (editingCustomer) {
      await updateMutation.mutateAsync({ id: editingCustomer.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleViewDetails = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingCustomer(id);
  };

  const confirmDelete = () => {
    if (deletingCustomer) {
      deleteMutation.mutate(deletingCustomer);
    }
  };

  const handleExport = () => {
    exportToCSV(
      customers.map(c => ({
        name: c.name,
        phone: c.phone,
        email: c.email,
      })),
      "customers",
      [
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
      ]
    );
    toast({ title: "Customers exported successfully" });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await parseCSV<InsertCustomer>(
        file,
        [
          { csvHeader: "Name", field: "name" },
          { csvHeader: "Phone", field: "phone" },
          { csvHeader: "Email", field: "email" },
        ],
        (row) => ({
          name: validateRequired(row["Name"], "Name"),
          phone: validateRequired(row["Phone"], "Phone"),
          email: validateEmail(row["Email"], "Email"),
        })
      );

      if (result.errors.length > 0) {
        toast({
          title: "Import errors",
          description: result.errors.slice(0, 3).join(", "),
          variant: "destructive",
        });
        return;
      }

      // Import customers one by one
      let successCount = 0;
      const failedRows: string[] = [];
      for (let i = 0; i < result.data.length; i++) {
        const customer = result.data[i];
        try {
          await apiRequest("POST", "/api/customers", customer);
          successCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          failedRows.push(`Row ${i + 2}: ${customer.name || 'Unknown'} - ${errorMsg}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      if (failedRows.length > 0) {
        toast({
          title: "Import completed with errors",
          description: `${successCount} customers imported. ${failedRows.length} failed: ${failedRows.slice(0, 2).join(', ')}${failedRows.length > 2 ? '...' : ''}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import successful",
          description: `${successCount} customers imported successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone.includes(search)
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <div className="flex gap-2">
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
            onClick={handleImportClick} 
            disabled={isImporting}
            data-testid="button-import-customers"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import CSV"}
          </Button>
          <Button variant="outline" onClick={handleExport} data-testid="button-export-customers">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-customer">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <SearchBar
        placeholder="Search by name, email, or phone..."
        value={search}
        onChange={setSearch}
        testId="input-search-customers"
      />

      <CustomerList
        customers={filteredCustomers}
        onViewDetails={handleViewDetails}
      />

      <CustomerFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingCustomer(null);
        }}
        customer={editingCustomer as any || undefined}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        onConfirm={confirmDelete}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
      />
    </div>
  );
}
