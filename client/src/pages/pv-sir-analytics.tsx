import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  Package,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

function formatCurrency(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  if (Number.isNaN(value)) return "₹0";
  return `₹${value.toLocaleString()}`;
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function PVSirAnalyticsPage() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "pv_sir" && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<any[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: releaseOrders = [], isLoading: releaseOrdersLoading } = useQuery<any[]>({
    queryKey: ["/api/release-orders"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
  });

  // Performance Metrics
  const performanceMetrics = useMemo(() => {
    const totalROs = releaseOrders.length;
    const approvedROs = releaseOrders.filter((ro) => ro.status === "accepted" || ro.status === "deployed").length;
    const pendingROs = releaseOrders.filter(
      (ro) => ro.status === "pending_pv_review" || ro.status === "pending_vp_review"
    ).length;
    const approvalRate = totalROs > 0 ? (approvedROs / totalROs) * 100 : 0;
    const avgApprovalTime = 0; // Can be calculated if we track timestamps

    return {
      totalROs,
      approvedROs,
      pendingROs,
      approvalRate,
      avgApprovalTime,
    };
  }, [releaseOrders]);

  // Financial Analytics - Calculate actual payment amounts
  const financialAnalytics = useMemo(() => {
    // Total invoice amounts (all invoices)
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    
    // Actual payments received (only completed invoices)
    const actualPaymentsReceived = invoices
      .filter((inv) => inv.status === "completed")
      .reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    
    // Also check release orders with completed payment status
    const roPayments = releaseOrders
      .filter((ro) => ro.paymentStatus === "completed")
      .reduce((sum, ro) => {
        // Get work order amount for this RO
        const wo = workOrders.find((w) => w.id === ro.workOrderId);
        return sum + Number(wo?.totalAmount ?? 0);
      }, 0);
    
    // Use the higher of the two (invoices or RO payments) as actual received
    const realAmountReceived = Math.max(actualPaymentsReceived, roPayments);
    
    const pendingRevenue = totalInvoiceAmount - realAmountReceived;
    const revenueGrowth = 0; // Can be calculated with historical data
    const avgInvoiceValue = invoices.length > 0 ? totalInvoiceAmount / invoices.length : 0;

    return {
      totalRevenue: totalInvoiceAmount,
      paidRevenue: realAmountReceived,
      actualPaymentsReceived: realAmountReceived,
      pendingRevenue,
      revenueGrowth,
      avgInvoiceValue,
    };
  }, [invoices, releaseOrders, workOrders]);

  // Business Metrics
  const businessMetrics = useMemo(() => {
    const totalWOs = workOrders.length;
    const activeWOs = workOrders.filter((wo) => wo.status === "paid" || wo.status === "active").length;
    const totalClients = new Set(workOrders.map((wo) => wo.clientId)).size;
    const activeClients = new Set(
      workOrders
        .filter((wo) => wo.status === "paid" || wo.status === "active" || wo.status === "client_accepted")
        .map((wo) => wo.clientId)
    ).size;
    const avgWOValue = totalWOs > 0 ? workOrders.reduce((sum, wo) => sum + Number(wo.totalAmount ?? 0), 0) / totalWOs : 0;

    return {
      totalWOs,
      activeWOs,
      totalClients,
      activeClients,
      avgWOValue,
    };
  }, [workOrders]);

  // Status Distribution Data for Charts
  const woStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    workOrders.forEach((wo) => {
      const status = wo.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: humanize(name),
      value,
    }));
  }, [workOrders]);

  const roStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    releaseOrders.forEach((ro) => {
      const status = ro.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: humanize(name),
      value,
    }));
  }, [releaseOrders]);

  // Monthly Revenue Trend - Show actual payments received
  const monthlyRevenueData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months.map((month) => {
      // Get actual payments (completed invoices) for this month
      const monthPayments = invoices
        .filter((inv) => {
          const date = new Date(inv.generatedAt || inv.createdAt || Date.now());
          return date.getMonth() === months.indexOf(month) && inv.status === "completed";
        })
        .reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
      return { month, revenue: monthPayments };
    });
  }, [invoices]);

  // Top Clients by Actual Payments Received
  const topClients = useMemo(() => {
    const clientPayments: Record<number, { name: string; payments: number; wos: number }> = {};
    
    // Calculate actual payments per client from completed invoices
    invoices
      .filter((inv) => inv.status === "completed" && inv.workOrderId)
      .forEach((inv) => {
        const wo = workOrders.find((w) => w.id === inv.workOrderId);
        if (wo) {
          const clientId = wo.clientId;
          if (!clientPayments[clientId]) {
            clientPayments[clientId] = {
              name: wo.businessSchoolName || `Client #${clientId}`,
              payments: 0,
              wos: 0,
            };
          }
          clientPayments[clientId].payments += Number(inv.amount ?? 0);
        }
      });
    
    // Also count work orders per client
    workOrders.forEach((wo) => {
      const clientId = wo.clientId;
      if (!clientPayments[clientId]) {
        clientPayments[clientId] = {
          name: wo.businessSchoolName || `Client #${clientId}`,
          payments: 0,
          wos: 0,
        };
      }
      clientPayments[clientId].wos += 1;
    });
    
    return Object.values(clientPayments)
      .sort((a, b) => b.payments - a.payments)
      .slice(0, 10);
  }, [workOrders, invoices]);

  const isLoading = workOrdersLoading || releaseOrdersLoading || invoicesLoading || bookingsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Business Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Comprehensive insights into business performance, financial metrics, and operational efficiency.
        </p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Actual Payments Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">
                    {formatCurrency(financialAnalytics.actualPaymentsReceived)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Real amount received</p>
              </CardContent>
            </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <div className="text-2xl font-semibold text-blue-600">
                {performanceMetrics.approvalRate.toFixed(1)}%
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Release orders approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <div className="text-2xl font-semibold text-purple-600">{businessMetrics.activeClients}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Out of {businessMetrics.totalClients} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" />
              Active Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <div className="text-2xl font-semibold text-orange-600">{businessMetrics.activeWOs}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Out of {businessMetrics.totalWOs} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="clients">Client Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#7334AE"
                        strokeWidth={2}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Work Order Status Distribution</CardTitle>
                <CardDescription>Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={woStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {woStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Release Order Status</CardTitle>
                <CardDescription>Current distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={roStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#7334AE" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Revenue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Invoice Amount</span>
                    <span className="text-lg font-semibold">{formatCurrency(financialAnalytics.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Actual Payments Received</span>
                    <span className="text-lg font-semibold text-emerald-600">
                      {formatCurrency(financialAnalytics.actualPaymentsReceived)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Payments</span>
                    <span className="text-lg font-semibold text-orange-600">
                      {formatCurrency(financialAnalytics.pendingRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Average Invoice Value</span>
                    <span className="text-lg font-semibold">{formatCurrency(financialAnalytics.avgInvoiceValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold">{invoices.length}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">
                    {invoices.filter((inv) => inv.status === "completed").length}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">
                    {invoices.length > 0
                      ? ((invoices.filter((inv) => inv.status === "completed").length / invoices.length) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Month</CardTitle>
              <CardDescription>Monthly revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#7334AE" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total R.O.s</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold">{performanceMetrics.totalROs}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">{performanceMetrics.approvedROs}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-orange-600">{performanceMetrics.pendingROs}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">
                    {performanceMetrics.approvalRate.toFixed(1)}%
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Release Order Status Distribution</CardTitle>
              <CardDescription>Visual breakdown of RO statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={roStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#7334AE" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold">{businessMetrics.totalClients}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">{businessMetrics.activeClients}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. WO Value</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">
                    {formatCurrency(businessMetrics.avgWOValue)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Actual Payments</CardTitle>
              <CardDescription>Clients with highest actual payments received</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No client data available.</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Work Orders</TableHead>
                        <TableHead className="text-right">Actual Payments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topClients.map((client, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{client.wos}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(client.payments)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

