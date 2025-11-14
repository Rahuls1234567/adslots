import { Home, LayoutDashboard, ClipboardCheck, DollarSign, Settings, LogOut, Package, BarChart3, Upload, Shield, Users, CheckCircle } from "lucide-react";
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
    { title: "Payments", url: "/payments", icon: DollarSign },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  manager: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Clients", url: "/clients", icon: Users },
    { title: "Work Orders", url: "/work-orders", icon: Package },
    { title: "Release Orders", url: "/release-orders", icon: ClipboardCheck },
    { title: "Accepted R.O.", url: "/accepted-release-orders", icon: CheckCircle },
    { title: "Slots", url: "/slots", icon: Package },
    { title: "Revenue", url: "/revenue", icon: DollarSign },
    { title: "Logs", url: "/logs", icon: ClipboardCheck },
  ],
  vp: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Approvals", url: "/approvals", icon: ClipboardCheck },
    { title: "Pending", url: "/pending", icon: ClipboardCheck },
    { title: "Accepted R.O.", url: "/accepted-release-orders", icon: CheckCircle },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Logs", url: "/logs", icon: ClipboardCheck },
  ],
  pv_sir: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Final Approvals", url: "/approvals", icon: ClipboardCheck },
    { title: "Pending", url: "/pv-pending", icon: ClipboardCheck },
    { title: "Accepted R.O.", url: "/accepted-release-orders", icon: CheckCircle },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ],
  accounts: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Payments", url: "/payments", icon: DollarSign },
    { title: "Invoices", url: "/invoices", icon: Package },
    { title: "Reports", url: "/accounts-reports", icon: BarChart3 },
    { title: "Accepted R.O.", url: "/accepted-release-orders", icon: CheckCircle },
  ],
  it: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Deployments", url: "/deployments", icon: Upload },
    { title: "Slot Master", url: "/slot-master", icon: Settings },
    { title: "Accepted R.O.", url: "/accepted-release-orders", icon: CheckCircle },
  ],
  admin: [
    { title: "Admin Dashboard", url: "/", icon: Shield },
    { title: "User Management", url: "/users", icon: Users },
    { title: "All Bookings", url: "/bookings", icon: Package },
    { title: "System Settings", url: "/settings", icon: Settings },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Accepted R.O.", url: "/accepted-release-orders", icon: CheckCircle },
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
