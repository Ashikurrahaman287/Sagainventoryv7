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
  Receipt,
  ClipboardList,
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
  { title: "Operational Costs", url: "/operational-costs", icon: Receipt, testId: "link-operational-costs" },
  { title: "Audit", url: "/audit", icon: ClipboardList, testId: "link-audit" },
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
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src="/ug-hub-logo.png"
            alt="Undergraduate Hub"
            className="h-10 w-10 object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">Undergraduate Hub</h1>
            <p className="text-xs text-muted-foreground leading-tight">Saga Inventory</p>
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
