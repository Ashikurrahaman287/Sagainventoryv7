import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("20");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your business!");

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName ?? "Saga Inventory");
      setBusinessEmail(settings.businessEmail ?? "contact@saga-inventory.com");
      setBusinessPhone(settings.businessPhone ?? "+1 234 567 8900");
      setLowStockThreshold(settings.lowStockThreshold ?? "20");
      setReceiptFooter(settings.receiptFooter ?? "Thank you for your business!");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
    },
  });

  const saveBusinessInfo = async () => {
    try {
      await saveMutation.mutateAsync({ businessName, businessEmail, businessPhone });
      toast({ title: "Business information saved" });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  const saveThreshold = async () => {
    const val = parseInt(lowStockThreshold);
    if (isNaN(val) || val < 0) {
      toast({ title: "Invalid threshold", description: "Enter a valid positive number", variant: "destructive" });
      return;
    }
    try {
      await saveMutation.mutateAsync({ lowStockThreshold: String(val) });
      toast({ title: "Low stock threshold saved" });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  const saveReceiptSettings = async () => {
    try {
      await saveMutation.mutateAsync({ receiptFooter });
      toast({ title: "Receipt settings saved" });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your application preferences</p>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Update your business details. These appear on invoices and receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              data-testid="input-business-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-email">Email</Label>
            <Input
              id="business-email"
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              data-testid="input-business-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-phone">Phone</Label>
            <Input
              id="business-phone"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              data-testid="input-business-phone"
            />
          </div>
          <Button
            onClick={saveBusinessInfo}
            disabled={saveMutation.isPending}
            data-testid="button-save-business"
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how Saga Inventory looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Toggle between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alert</CardTitle>
          <CardDescription>
            Products below this quantity will show as "Low Stock" everywhere in the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="low-stock-threshold">Threshold Quantity</Label>
            <Input
              id="low-stock-threshold"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              data-testid="input-low-stock-threshold"
            />
            <p className="text-sm text-muted-foreground">
              Products with quantity below this number will trigger low stock alerts.
            </p>
          </div>
          <Button
            onClick={saveThreshold}
            disabled={saveMutation.isPending}
            data-testid="button-save-threshold"
          >
            {saveMutation.isPending ? "Saving..." : "Save Threshold"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Settings</CardTitle>
          <CardDescription>
            Configure the footer message shown on all invoices and receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-footer">Receipt Footer Message</Label>
            <Input
              id="receipt-footer"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              data-testid="input-receipt-footer"
            />
          </div>
          <Button
            onClick={saveReceiptSettings}
            disabled={saveMutation.isPending}
            data-testid="button-save-receipt"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
