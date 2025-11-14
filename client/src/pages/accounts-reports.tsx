import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { DollarSign, FileText, TrendingUp, Clock, CheckCircle, XCircle, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Invoice {
  id: number;
  workOrderId: number | null;
  amount: string;
  status: string;
  invoiceType?: string;
  dueDate?: string | null;
  generatedAt: string;
}

function formatCurrency(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  if (Number.isNaN(value)) return "₹0";
  return `₹${value.toLocaleString()}`;
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function AccountsReportsPage() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "accounts" && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<Array<{ workOrder: any; items: any[] }>>({
    queryKey: ["/api/work-orders"],
  });

  const { data: releaseOrders = [], isLoading: releaseOrdersLoading } = useQuery<any[]>({
    queryKey: ["/api/release-orders"],
  });

  const isLoading = invoicesLoading || workOrdersLoading || releaseOrdersLoading;

  // Financial Metrics
  const financialMetrics = useMemo(() => {
    const totalInvoices = invoices.length;
    const completedInvoices = invoices.filter((inv) => inv.status === "completed");
    const pendingInvoices = invoices.filter((inv) => inv.status === "pending");
    const failedInvoices = invoices.filter((inv) => inv.status === "failed");
    const partialInvoices = invoices.filter((inv) => inv.status === "partial");

    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    const completedAmount = completedInvoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    const failedAmount = failedInvoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    const partialAmount = partialInvoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);

    const paymentRate = totalInvoices > 0 ? (completedInvoices.length / totalInvoices) * 100 : 0;
    const collectionRate = totalInvoiceAmount > 0 ? (completedAmount / totalInvoiceAmount) * 100 : 0;

    return {
      totalInvoices,
      completedInvoices: completedInvoices.length,
      pendingInvoices: pendingInvoices.length,
      failedInvoices: failedInvoices.length,
      partialInvoices: partialInvoices.length,
      totalInvoiceAmount,
      completedAmount,
      pendingAmount,
      failedAmount,
      partialAmount,
      paymentRate,
      collectionRate,
    };
  }, [invoices]);

  // Invoice Type Metrics
  const invoiceTypeMetrics = useMemo(() => {
    const proformaInvoices = invoices.filter((inv) => inv.invoiceType === "proforma");
    const taxInvoices = invoices.filter((inv) => inv.invoiceType === "tax_invoice");

    const proformaAmount = proformaInvoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    const taxInvoiceAmount = taxInvoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);

    return {
      proformaCount: proformaInvoices.length,
      taxInvoiceCount: taxInvoices.length,
      proformaAmount,
      taxInvoiceAmount,
    };
  }, [invoices]);

  // Revenue Trends Chart Data
  const revenueChartData = useMemo(() => {
    const now = new Date();
    const ranges: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "all": Infinity,
    };
    const days = ranges[timeRange];

    const revenueByDate: Record<string, number> = {};
    invoices
      .filter((inv) => inv.status === "completed")
      .forEach((inv) => {
        const date = new Date(inv.generatedAt);
        const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo <= days) {
          const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (!revenueByDate[dateKey]) {
            revenueByDate[dateKey] = 0;
          }
          revenueByDate[dateKey] += Number(inv.amount ?? 0);
        }
      });

    return Object.entries(revenueByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [invoices, timeRange]);

  // Monthly Revenue Data
  const monthlyRevenueData = useMemo(() => {
    const monthly: Record<string, { completed: number; pending: number; total: number }> = {};
    invoices.forEach((inv) => {
      const date = new Date(inv.generatedAt);
      const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!monthly[monthKey]) {
        monthly[monthKey] = { completed: 0, pending: 0, total: 0 };
      }
      const amount = Number(inv.amount ?? 0);
      monthly[monthKey].total += amount;
      if (inv.status === "completed") {
        monthly[monthKey].completed += amount;
      } else {
        monthly[monthKey].pending += amount;
      }
    });

    return Object.entries(monthly)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months
  }, [invoices]);

  // Invoice Status Pie Chart Data
  const invoiceStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    invoices.forEach((inv) => {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    });
    return Object.entries(statusCounts)
      .map(([name, value]) => ({ name: humanize(name), value }))
      .filter((item) => item.value > 0);
  }, [invoices]);

  // Invoice Type Pie Chart Data
  const invoiceTypeData = useMemo(() => {
    return [
      { name: "Proforma", value: invoiceTypeMetrics.proformaCount },
      { name: "Tax Invoice", value: invoiceTypeMetrics.taxInvoiceCount },
    ].filter((item) => item.value > 0);
  }, [invoiceTypeMetrics]);

  // Payment Status by Amount
  const paymentStatusByAmount = useMemo(() => {
    return [
      { name: "Completed", amount: financialMetrics.completedAmount, count: financialMetrics.completedInvoices },
      { name: "Pending", amount: financialMetrics.pendingAmount, count: financialMetrics.pendingInvoices },
      { name: "Failed", amount: financialMetrics.failedAmount, count: financialMetrics.failedInvoices },
      { name: "Partial", amount: financialMetrics.partialAmount, count: financialMetrics.partialInvoices },
    ].filter((item) => item.count > 0);
  }, [financialMetrics]);

  // Release Order Payment Status
  const releaseOrderPaymentData = useMemo(() => {
    const paidROs = releaseOrders.filter((ro) => ro.paymentStatus === "completed");
    const unpaidROs = releaseOrders.filter((ro) => ro.paymentStatus !== "completed");

    const paidAmount = paidROs.reduce((sum, ro) => {
      const wo = workOrders.find((w) => w.workOrder?.id === ro.workOrderId);
      return sum + Number(wo?.workOrder?.totalAmount ?? 0);
    }, 0);

    const unpaidAmount = unpaidROs.reduce((sum, ro) => {
      const wo = workOrders.find((w) => w.workOrder?.id === ro.workOrderId);
      return sum + Number(wo?.workOrder?.totalAmount ?? 0);
    }, 0);

    return [
      { name: "Paid", amount: paidAmount, count: paidROs.length },
      { name: "Unpaid", amount: unpaidAmount, count: unpaidROs.length },
    ].filter((item) => item.count > 0);
  }, [releaseOrders, workOrders]);

  // Overdue Invoices
  const overdueInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      if (inv.status === "completed") return false;
      if (!inv.dueDate) return false;
      const dueDate = new Date(inv.dueDate);
      return dueDate < now;
    });
  }, [invoices]);

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Accounts Reports</h1>
            <p className="text-muted-foreground">
              Financial reports and analytics based on real database data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Total Revenue
                </CardTitle>
                <CardDescription>Completed payments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">
                    {formatCurrency(financialMetrics.completedAmount)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Total Invoices
                </CardTitle>
                <CardDescription>All invoices issued</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">
                    {formatCurrency(financialMetrics.totalInvoiceAmount)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Pending Amount
                </CardTitle>
                <CardDescription>Awaiting payment</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="text-2xl font-semibold text-orange-600">
                    {formatCurrency(financialMetrics.pendingAmount)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Payment Rate
                </CardTitle>
                <CardDescription>Completion percentage</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">
                    {financialMetrics.paymentRate.toFixed(1)}%
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice Status Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Status Distribution</CardTitle>
                <CardDescription>Breakdown by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : invoiceStatusData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No invoice data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={invoiceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {invoiceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Type Distribution</CardTitle>
                <CardDescription>Proforma vs Tax Invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : invoiceTypeData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No invoice data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={invoiceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {invoiceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Status by Amount */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status by Amount</CardTitle>
              <CardDescription>Amount breakdown by payment status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : paymentStatusByAmount.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No payment data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentStatusByAmount}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="amount" fill="#10b981" name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold">{financialMetrics.totalInvoices}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">
                    {financialMetrics.completedInvoices}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-orange-600">
                    {financialMetrics.pendingInvoices}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-red-600">
                    {financialMetrics.failedInvoices}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-red-600">
                    {overdueInvoices.length}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice Type Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Type Comparison</CardTitle>
              <CardDescription>Proforma vs Tax Invoices (Count and Amount)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : invoiceTypeData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No invoice data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: "Proforma", count: invoiceTypeMetrics.proformaCount, amount: invoiceTypeMetrics.proformaAmount },
                    { name: "Tax Invoice", count: invoiceTypeMetrics.taxInvoiceCount, amount: invoiceTypeMetrics.taxInvoiceAmount },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number, name: string) => name === "amount" ? formatCurrency(value) : value} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count" />
                    <Bar yAxisId="right" dataKey="amount" fill="#82ca9d" name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          {/* Revenue Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Payment received over time ({timeRange})</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : revenueChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue (Last 6 Months)</CardTitle>
              <CardDescription>Completed vs Pending revenue by month</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : monthlyRevenueData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No monthly revenue data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {formatCurrency(financialMetrics.completedAmount)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <div className="text-2xl font-semibold text-orange-600">
                    {formatCurrency(financialMetrics.pendingAmount)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">
                    {financialMetrics.collectionRate.toFixed(1)}%
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {/* Release Order Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Release Order Payment Status</CardTitle>
              <CardDescription>Payment status breakdown by amount</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : releaseOrderPaymentData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No payment data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={releaseOrderPaymentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="amount" fill="#3b82f6" name="Amount" />
                    <Bar dataKey="count" fill="#10b981" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Payment Status Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold text-emerald-600">
                      {formatCurrency(financialMetrics.completedAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {financialMetrics.completedInvoices} invoices
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold text-orange-600">
                      {formatCurrency(financialMetrics.pendingAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {financialMetrics.pendingInvoices} invoices
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold text-red-600">
                      {formatCurrency(financialMetrics.failedAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {financialMetrics.failedInvoices} invoices
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold text-red-600">
                      {formatCurrency(
                        overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {overdueInvoices.length} invoices
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

