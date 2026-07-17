import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Sales from "@/pages/sales";
import SalesHistory from "@/pages/sales-history";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Sellers from "@/pages/sellers";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import OperationalCosts from "@/pages/operational-costs";
import Audit from "@/pages/audit";
import EmailSettings from "@/pages/email-settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/products" component={Products} />
      <Route path="/sales" component={Sales} />
      <Route path="/sales/history" component={SalesHistory} />
      <Route path="/customers" component={Customers} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/sellers" component={Sellers} />
      <Route path="/reports" component={Reports} />
      <Route path="/operational-costs" component={OperationalCosts} />
      <Route path="/audit" component={Audit} />
      <Route path="/email" component={EmailSettings} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { isAuthenticated, isLoading, logout, isLoggingOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                data-testid="button-logout"
                title="Sign out"
              >
                {isLoggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-8">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AppShell />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
