import { Home, LayoutDashboard, ClipboardCheck, DollarSign, Settings, LogOut, Package, BarChart3, Upload } from "lucide-react";
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const roleMenuItems = {
  client: [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Bookings", url: "/bookings", icon: Package },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  manager: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Approvals", url: "/approvals", icon: ClipboardCheck },
    { title: "Slots", url: "/slots", icon: Package },
    { title: "Revenue", url: "/revenue", icon: DollarSign },
  ],
  vp: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Pending Approvals", url: "/approvals", icon: ClipboardCheck },
    { title: "Reports", url: "/reports", icon: BarChart3 },
  ],
  pv_sir: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Final Approvals", url: "/approvals", icon: ClipboardCheck },
    { title: "Overview", url: "/overview", icon: BarChart3 },
  ],
  accounts: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Payments", url: "/payments", icon: DollarSign },
    { title: "Invoices", url: "/invoices", icon: Package },
  ],
  it: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Deployments", url: "/deployments", icon: Upload },
    { title: "Slot Master", url: "/slot-master", icon: Settings },
  ],
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const menuItems = roleMenuItems[user.role as keyof typeof roleMenuItems] || roleMenuItems.client;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ad Banner System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/ /g, "-")}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut />
                <span>Logout</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
