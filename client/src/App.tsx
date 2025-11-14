import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import ClientDashboard from "@/pages/client-dashboard";
import Analytics from "@/pages/analytics";
import PVSirAnalyticsPage from "@/pages/pv-sir-analytics";
import ManagerDashboard from "@/pages/manager-dashboard";
import VPDashboard from "@/pages/vp-dashboard";
import PVSirDashboard from "@/pages/pv-sir-dashboard";
import AccountsDashboard from "@/pages/accounts-dashboard";
import ITDashboard from "@/pages/it-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import SettingsPage from "@/pages/settings";
import ReleaseOrdersPage from "@/pages/release-orders";
import ReleaseOrderDetailPage from "@/pages/release-order-detail";
import AcceptedReleaseOrdersPage from "@/pages/accepted-release-orders";
import PaymentWorkOrderDetailPage from "@/pages/payment-work-order-detail";
import ClientBookings from "@/pages/client-bookings";
import WorkOrdersPage from "@/pages/work-orders";
import ClientPayments from "@/pages/client-payments";
import WorkOrderDetailPage from "@/pages/work-order-detail";
import RequestReviewPage from "@/pages/request-review";
import ClientManagementPage from "@/pages/client-management";
import ManagerWorkOrderNewPage from "@/pages/manager-work-order-new";
import LogsPage from "@/pages/logs";
import PVFinalApprovalsPage from "@/pages/pv-final-approvals";
import VPApprovalsPage from "@/pages/vp-approvals";
import VPPendingPage from "@/pages/vp-pending";
import PVPendingPage from "@/pages/pv-pending";
import ManagerSlotsPage from "@/pages/manager-slots";
import RevenuePage from "@/pages/revenue";
import VPReportsPage from "@/pages/vp-reports";
import AccountsPaymentsPage from "@/pages/accounts-payments";
import AccountsInvoicesPage from "@/pages/accounts-invoices";
import AccountsReportsPage from "@/pages/accounts-reports";
import ITSlotMasterPage from "@/pages/it-slot-master";
import ITDeploymentsPage from "@/pages/it-deployments";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function RoleBasedDashboard() {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "client":
      return <ClientDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "vp":
      return <VPDashboard />;
    case "pv_sir":
      return <PVSirDashboard />;
    case "accounts":
      return <AccountsDashboard />;
    case "it":
      return <ITDashboard />;
    default:
      return <ClientDashboard />;
  }
}

function RoleBasedAnalytics() {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // PV Sir and Admin get the comprehensive analytics page
  if (user.role === "pv_sir" || user.role === "admin") {
    return <PVSirAnalyticsPage />;
  }
  
  // Others get the standard analytics page
  return <Analytics />;
}

function RoleBasedPayments() {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // Accounts get the comprehensive payment tracking page
  if (user.role === "accounts" || user.role === "admin") {
    return <AccountsPaymentsPage />;
  }
  
  // Clients get the standard payments page
  return <ClientPayments />;
}

function RoleBasedApprovals() {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  // VP gets the VP approvals page (orders approved by VP)
  if (user.role === "vp") {
    return <VPApprovalsPage />;
  }
  
  // PV Sir gets the final approvals page
  if (user.role === "pv_sir") {
    return <PVFinalApprovalsPage />;
  }
  
  // Others redirect to dashboard
  return <Redirect to="/" />;
}

// Route helper: if client hits /bookings, show client bookings; others route to dashboard or their own list
function ClientNameResolver() {
  const { user } = useAuth();
  if (!user) return <Login />;
  if (user.role === 'client') return <ClientBookings />;
  // For managers/admins, reuse Work Orders page for /bookings or redirect to '/work-orders'
  if (user.role === 'manager') return <ReleaseOrdersPage />;
  return <RoleBasedDashboard />;
}

function Router() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Switch>
      <Route path="/bookings">
        <ProtectedRoute component={ClientNameResolver} />
      </Route>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={RoleBasedAnalytics} />
      </Route>
      <Route path="/release-orders">
        <ProtectedRoute component={ReleaseOrdersPage} />
      </Route>
      <Route path="/release-orders/:id">
        <ProtectedRoute component={ReleaseOrderDetailPage} />
      </Route>
      <Route path="/accepted-release-orders">
        <ProtectedRoute component={AcceptedReleaseOrdersPage} />
      </Route>
      <Route path="/approvals">
        <ProtectedRoute component={RoleBasedApprovals} />
      </Route>
      <Route path="/pending">
        <ProtectedRoute component={VPPendingPage} />
      </Route>
      <Route path="/pv-pending">
        <ProtectedRoute component={PVPendingPage} />
      </Route>
      <Route path="/work-orders">
        <ProtectedRoute component={WorkOrdersPage} />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={ClientManagementPage} />
      </Route>
      <Route path="/manager/work-orders/new">
        <ProtectedRoute component={ManagerWorkOrderNewPage} />
      </Route>
      <Route path="/slots">
        <ProtectedRoute component={ManagerSlotsPage} />
      </Route>
      <Route path="/revenue">
        <ProtectedRoute component={RevenuePage} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={VPReportsPage} />
      </Route>
      <Route path="/logs">
        <ProtectedRoute component={LogsPage} />
      </Route>
      <Route path="/request-review">
        <ProtectedRoute component={RequestReviewPage} />
      </Route>
      <Route path="/work-orders/:id">
        <ProtectedRoute component={WorkOrderDetailPage} />
      </Route>
      <Route path="/payments">
        <ProtectedRoute component={RoleBasedPayments} />
      </Route>
      <Route path="/payments/work-orders/:id">
        <ProtectedRoute component={PaymentWorkOrderDetailPage} />
      </Route>
      <Route path="/invoices">
        <ProtectedRoute component={AccountsInvoicesPage} />
      </Route>
      <Route path="/accounts-reports">
        <ProtectedRoute component={AccountsReportsPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      <Route path="/slot-master">
        <ProtectedRoute component={ITSlotMasterPage} />
      </Route>
      <Route path="/deployments">
        <ProtectedRoute component={ITDeploymentsPage} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={RoleBasedDashboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };
  
  if (!isAuthenticated) {
    return <Router />;
  }
  
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h2 className="font-semibold" data-testid="text-user-name">{user?.name}</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-user-role">
                  {user?.role.replace("_", " ").toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
