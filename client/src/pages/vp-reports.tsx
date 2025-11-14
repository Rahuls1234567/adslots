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
import { TrendingUp, TrendingDown, DollarSign, FileText, Users, Package, CheckCircle, Clock } from "lucide-react";

function formatCurrency(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  if (Number.isNaN(value)) return "₹0";
  return `₹${value.toLocaleString()}`;
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function VPReportsPage() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "vp" && user.role !== "admin") {
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

  const financialMetrics = useMemo(() => {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) => inv.status === "completed").length;
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    
    // Actual payments received (only completed invoices)
    const actualPaymentsReceived = invoices
      .filter((inv) => inv.status === "completed")
      .reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
    
    // Also check release orders with completed payment status
    const roPayments = releaseOrders
      .filter((ro) => ro.paymentStatus === "completed")
      .reduce((sum, ro) => {
        const wo = workOrders.find((w) => w.id === ro.workOrderId);
        return sum + Number(wo?.totalAmount ?? 0);
      }, 0);
    
    // Use the higher of the two as actual received
    const realAmountReceived = Math.max(actualPaymentsReceived, roPayments);
    
    const pendingAmount = totalInvoiceAmount - realAmountReceived;
    const paymentRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    return {
      totalInvoices,
      paidInvoices,
      totalInvoiceAmount,
      paidAmount: realAmountReceived,
      actualPaymentsReceived: realAmountReceived,
      pendingAmount,
      paymentRate,
    };
  }, [invoices, releaseOrders, workOrders]);

  const workOrderMetrics = useMemo(() => {
    const total = workOrders.length;
    const quoted = workOrders.filter((wo) => wo.status === "quoted").length;
    const accepted = workOrders.filter((wo) => wo.status === "client_accepted").length;
    const active = workOrders.filter((wo) => wo.status === "paid" || wo.status === "active").length;
    const totalValue = workOrders.reduce((sum, wo) => sum + Number(wo.totalAmount ?? 0), 0);
    const averageValue = total > 0 ? totalValue / total : 0;

    return {
      total,
      quoted,
      accepted,
      active,
      totalValue,
      averageValue,
    };
  }, [workOrders]);

  const releaseOrderMetrics = useMemo(() => {
    const total = releaseOrders.length;
    const pending = releaseOrders.filter((ro) => 
      ro.status === "pending_vp_review" || ro.status === "pending_pv_review" || ro.status === "pending_manager_review"
    ).length;
    const accepted = releaseOrders.filter((ro) => ro.status === "accepted").length;
    const deployed = releaseOrders.filter((ro) => ro.status === "deployed").length;
    const paid = releaseOrders.filter((ro) => ro.paymentStatus === "completed").length;

    return {
      total,
      pending,
      accepted,
      deployed,
      paid,
    };
  }, [releaseOrders]);

  const clientMetrics = useMemo(() => {
    const uniqueClients = new Set(workOrders.map((wo) => wo.clientId));
    const clientCount = uniqueClients.size;
    const activeClients = new Set(
      workOrders
        .filter((wo) => wo.status === "paid" || wo.status === "active" || wo.status === "client_accepted")
        .map((wo) => wo.clientId)
    ).size;

    return {
      total: clientCount,
      active: activeClients,
    };
  }, [workOrders]);

  const recentWorkOrders = useMemo(() => {
    return workOrders
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [workOrders]);

  const recentReleaseOrders = useMemo(() => {
    return releaseOrders
      .slice()
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      .slice(0, 10);
  }, [releaseOrders]);

  const isLoading = workOrdersLoading || releaseOrdersLoading || invoicesLoading || bookingsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Financial & Analytical Reports</h1>
        <p className="text-muted-foreground">
          Consolidated view of financial performance, work orders, and business metrics.
        </p>
      </div>

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">Financial Overview</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="release-orders">Release Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Actual Payments Received
                </CardTitle>
                <CardDescription>Real amount received</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">
                    {formatCurrency(financialMetrics.actualPaymentsReceived)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Total Invoice Amount
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
                  Pending Payments
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

          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
              <CardDescription>Breakdown of actual payments and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                  <div className="text-2xl font-semibold">{financialMetrics.totalInvoices}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Actual Payments Received</div>
                  <div className="text-2xl font-semibold text-emerald-600">
                    {formatCurrency(financialMetrics.actualPaymentsReceived)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Pending Payments</div>
                  <div className="text-2xl font-semibold text-orange-600">
                    {formatCurrency(financialMetrics.pendingAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Average Invoice</div>
                  <div className="text-2xl font-semibold">
                    {formatCurrency(
                      financialMetrics.totalInvoices > 0
                        ? financialMetrics.totalInvoiceAmount / financialMetrics.totalInvoices
                        : 0
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold">{workOrderMetrics.total}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Quoted</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">{workOrderMetrics.quoted}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">{workOrderMetrics.accepted}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <div className="text-2xl font-semibold">{formatCurrency(workOrderMetrics.totalValue)}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Work Orders</CardTitle>
              <CardDescription>Latest work orders in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentWorkOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No work orders found.</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>WO #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentWorkOrders.map((wo) => (
                        <TableRow key={wo.id}>
                          <TableCell className="font-medium">#{wo.id}</TableCell>
                          <TableCell>{wo.businessSchoolName || `Client #${wo.clientId}`}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{humanize(wo.status)}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(wo.totalAmount)}</TableCell>
                          <TableCell>{new Date(wo.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="release-orders" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total R.O.</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold">{releaseOrderMetrics.total}</div>
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
                  <div className="text-2xl font-semibold text-orange-600">{releaseOrderMetrics.pending}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">{releaseOrderMetrics.accepted}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Deployed</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">{releaseOrderMetrics.deployed}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-green-600">{releaseOrderMetrics.paid}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Release Orders</CardTitle>
              <CardDescription>Latest release orders in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentReleaseOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No release orders found.</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RO #</TableHead>
                        <TableHead>WO #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Issued</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReleaseOrders.map((ro) => (
                        <TableRow key={ro.id}>
                          <TableCell className="font-medium">#{ro.id}</TableCell>
                          <TableCell>#{ro.workOrderId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{humanize(ro.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ro.paymentStatus === "completed" ? "default" : "outline"}>
                              {humanize(ro.paymentStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(ro.issuedAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold">{clientMetrics.total}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  Active Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-10" />
                ) : (
                  <div className="text-2xl font-semibold text-emerald-600">{clientMetrics.active}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Average WO Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="text-2xl font-semibold text-blue-600">
                    {formatCurrency(workOrderMetrics.averageValue)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Work Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quoted</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${
                              workOrderMetrics.total > 0
                                ? (workOrderMetrics.quoted / workOrderMetrics.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{workOrderMetrics.quoted}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accepted</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600"
                          style={{
                            width: `${
                              workOrderMetrics.total > 0
                                ? (workOrderMetrics.accepted / workOrderMetrics.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{workOrderMetrics.accepted}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600"
                          style={{
                            width: `${
                              workOrderMetrics.total > 0
                                ? (workOrderMetrics.active / workOrderMetrics.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{workOrderMetrics.active}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Release Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-600"
                          style={{
                            width: `${
                              releaseOrderMetrics.total > 0
                                ? (releaseOrderMetrics.pending / releaseOrderMetrics.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{releaseOrderMetrics.pending}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accepted</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600"
                          style={{
                            width: `${
                              releaseOrderMetrics.total > 0
                                ? (releaseOrderMetrics.accepted / releaseOrderMetrics.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{releaseOrderMetrics.accepted}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Deployed</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${
                              releaseOrderMetrics.total > 0
                                ? (releaseOrderMetrics.deployed / releaseOrderMetrics.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{releaseOrderMetrics.deployed}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

