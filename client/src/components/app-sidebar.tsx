import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  UserCircle,
  FileText,
  Settings,
  History,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, testId: "link-dashboard" },
  { title: "Products", url: "/products", icon: Package, testId: "link-products" },
  { title: "New Sale", url: "/sales", icon: ShoppingCart, testId: "link-sales" },
  { title: "Sales History", url: "/sales/history", icon: History, testId: "link-sales-history" },
];

const managementItems = [
  { title: "Customers", url: "/customers", icon: Users, testId: "link-customers" },
  { title: "Suppliers", url: "/suppliers", icon: Truck, testId: "link-suppliers" },
  { title: "Sellers", url: "/sellers", icon: UserCircle, testId: "link-sellers" },
];

const reportsItems = [
  { title: "Reports", url: "/reports", icon: FileText, testId: "link-reports" },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings, testId: "link-settings" },
];

function NavGroup({ label, items }: { label?: string; items: typeof mainItems }) {
  const [location] = useLocation();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location === item.url}
                data-testid={item.testId}
              >
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Saga Inventory</h1>
            <p className="text-xs text-muted-foreground">Inventory Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Main" items={mainItems} />
        <NavGroup label="Management" items={managementItems} />
        <NavGroup label="Analytics" items={reportsItems} />
        <NavGroup items={settingsItems} />
      </SidebarContent>
    </Sidebar>
  );
}
