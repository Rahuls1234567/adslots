import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  TrendingUp,
  Users,
  Package,
  Calendar,
  Search,
} from "lucide-react";

function formatCurrency(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  if (Number.isNaN(value)) return "₹0";
  return `₹${value.toLocaleString()}`;
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function getDaysOverdue(dueDate: string | null | undefined): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function AccountsPaymentsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "accounts" && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: workOrdersData = [], isLoading: workOrdersLoading } = useQuery<Array<{ workOrder: any; items: any[] }>>({
    queryKey: ["/api/work-orders"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: releaseOrders = [], isLoading: releaseOrdersLoading } = useQuery<any[]>({
    queryKey: ["/api/release-orders"],
  });

  // Get all clients
  const clients = useMemo(() => {
    const clientSet = new Set<number>();
    workOrdersData.forEach(({ workOrder }) => clientSet.add(workOrder.clientId));
    return Array.from(clientSet);
  }, [workOrdersData]);

  // Process payment data
  // Only show manager approved PO slots and exclude rejected work orders
  const paymentData = useMemo(() => {
    return workOrdersData
      .filter(({ workOrder: wo }) => {
        // Only include work orders where:
        // 1. PO is approved by manager (poApproved === true)
        // 2. Work order is not rejected (status !== "rejected")
        return wo.poApproved === true && wo.status !== "rejected";
      })
      .map(({ workOrder: wo, items }) => {
        const woInvoices = invoices.filter((inv) => inv.workOrderId === wo.id || inv.customWorkOrderId === wo.customWorkOrderId);
        const proformaInvoice = woInvoices.find((inv) => inv.invoiceType === "proforma");
        const releaseOrder = releaseOrders.find((ro) => ro.workOrderId === wo.id || ro.customWorkOrderId === wo.customWorkOrderId);
        
        const totalAmount = Number(wo.totalAmount ?? 0);
        const paidAmount = woInvoices
          .filter((inv) => inv.status === "completed")
          .reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
        const pendingAmount = totalAmount - paidAmount;
        
        // Check for overdue
        const dueDate = proformaInvoice?.dueDate || releaseOrder?.dueDate || null;
        const daysOverdue = getDaysOverdue(dueDate);
        const isOverdue = daysOverdue > 0 && pendingAmount > 0;
        const isDueSoon = daysOverdue === 0 && pendingAmount > 0 && dueDate;
        
        // Get payment status
        // Payment is only "paid" if:
        // 1. Paid amount >= total amount AND
        // 2. Work order status is "paid" (manager has approved)
        let paymentStatus: "paid" | "pending" | "overdue" | "due_soon" = "pending";
        if (paidAmount >= totalAmount && wo.status === "paid") {
          paymentStatus = "paid";
        } else if (paidAmount >= totalAmount && wo.status !== "paid") {
          // Payment received but not yet approved by manager
          paymentStatus = "pending";
        } else if (isOverdue) {
          paymentStatus = "overdue";
        } else if (isDueSoon) {
          paymentStatus = "due_soon";
        }

        return {
          workOrderId: wo.id,
          clientId: wo.clientId,
          clientName: wo.businessSchoolName || `Client #${wo.clientId}`,
          paymentMode: wo.paymentMode || "full",
          totalAmount,
          paidAmount,
          pendingAmount,
          dueDate,
          daysOverdue,
          isOverdue,
          isDueSoon,
          paymentStatus,
          proformaInvoice,
          releaseOrder,
          invoices: woInvoices,
          items: items || [],
        };
      });
  }, [workOrdersData, invoices, releaseOrders]);

  // Filter payment data
  const filteredPayments = useMemo(() => {
    return paymentData.filter((payment) => {
      if (searchTerm && !payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !payment.workOrderId.toString().includes(searchTerm)) {
        return false;
      }
      if (paymentModeFilter !== "all" && payment.paymentMode !== paymentModeFilter) {
        return false;
      }
      if (statusFilter !== "all" && payment.paymentStatus !== statusFilter) {
        return false;
      }
      if (clientFilter !== "all" && payment.clientId.toString() !== clientFilter) {
        return false;
      }
      return true;
    });
  }, [paymentData, searchTerm, paymentModeFilter, statusFilter, clientFilter]);

  // Alerts for missed/overdue payments
  const overduePayments = useMemo(() => {
    return paymentData.filter((p) => p.isOverdue);
  }, [paymentData]);

  const dueSoonPayments = useMemo(() => {
    return paymentData.filter((p) => p.isDueSoon);
  }, [paymentData]);

  // Payment statistics
  const stats = useMemo(() => {
    const total = paymentData.length;
    const paid = paymentData.filter((p) => p.paymentStatus === "paid").length;
    const pending = paymentData.filter((p) => p.paymentStatus === "pending").length;
    const overdue = paymentData.filter((p) => p.paymentStatus === "overdue").length;
    const totalAmount = paymentData.reduce((sum, p) => sum + p.totalAmount, 0);
    const paidAmount = paymentData.reduce((sum, p) => sum + p.paidAmount, 0);
    const pendingAmount = paymentData.reduce((sum, p) => sum + p.pendingAmount, 0);
    const overdueAmount = paymentData
      .filter((p) => p.paymentStatus === "overdue")
      .reduce((sum, p) => sum + p.pendingAmount, 0);

    return {
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
    };
  }, [paymentData]);

  // Payment by client
  const paymentsByClient = useMemo(() => {
    const clientMap: Record<number, { name: string; total: number; paid: number; pending: number; count: number }> = {};
    paymentData.forEach((payment) => {
      if (!clientMap[payment.clientId]) {
        clientMap[payment.clientId] = {
          name: payment.clientName,
          total: 0,
          paid: 0,
          pending: 0,
          count: 0,
        };
      }
      clientMap[payment.clientId].total += payment.totalAmount;
      clientMap[payment.clientId].paid += payment.paidAmount;
      clientMap[payment.clientId].pending += payment.pendingAmount;
      clientMap[payment.clientId].count += 1;
    });
    return Object.values(clientMap).sort((a, b) => b.pending - a.pending);
  }, [paymentData]);

  // Payment by slot (from work order items)
  const paymentsBySlot = useMemo(() => {
    const slotMap: Record<string, { slotId: string; mediaType: string; total: number; paid: number; pending: number; count: number }> = {};
    paymentData.forEach((payment) => {
      payment.items.forEach((item: any) => {
        const slotId = item.customSlotId || item.slot?.slotId || (item.slotId ? String(item.slotId) : null);
        if (slotId) {
          if (!slotMap[slotId]) {
            slotMap[slotId] = {
              slotId: slotId,
              mediaType: item.slot?.mediaType || "unknown",
              total: 0,
              paid: 0,
              pending: 0,
              count: 0,
            };
          }
          const itemAmount = Number(item.subtotal || item.unitPrice || 0);
          slotMap[slotId].total += itemAmount;
          // Distribute payment proportionally
          const paymentRatio = payment.totalAmount > 0 ? payment.paidAmount / payment.totalAmount : 0;
          slotMap[slotId].paid += itemAmount * paymentRatio;
          slotMap[slotId].pending += itemAmount * (1 - paymentRatio);
          slotMap[slotId].count += 1;
        }
      });
    });
    return Object.values(slotMap).sort((a, b) => b.pending - a.pending);
  }, [paymentData]);

  const isLoading = workOrdersLoading || invoicesLoading || releaseOrdersLoading;

  // Early return if still loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8" />
            Payment Tracking & Reports
          </h1>
          <p className="text-muted-foreground">
            Track payments, receive alerts for overdue payments, and access detailed reports per client and slot.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="w-8 h-8" />
          Payment Tracking & Reports
        </h1>
        <p className="text-muted-foreground">
          Track payments, receive alerts for overdue payments, and access detailed reports per client and slot.
        </p>
      </div>

      {/* Alerts for Overdue/Missed Payments */}
      {(overduePayments.length > 0 || dueSoonPayments.length > 0) && (
        <div className="space-y-3">
          {overduePayments.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Overdue Payments Alert</AlertTitle>
              <AlertDescription>
                {overduePayments.length} payment(s) are overdue. Total overdue amount:{" "}
                {formatCurrency(overduePayments.reduce((sum, p) => sum + p.pendingAmount, 0))}
              </AlertDescription>
            </Alert>
          )}
          {dueSoonPayments.length > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Payments Due Soon</AlertTitle>
              <AlertDescription>
                {dueSoonPayments.length} payment(s) are due today or soon. Total amount:{" "}
                {formatCurrency(dueSoonPayments.reduce((sum, p) => sum + p.pendingAmount, 0))}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Total Payments Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(stats.paidAmount)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Out of {formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-2xl font-semibold text-orange-600">{formatCurrency(stats.pendingAmount)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{stats.pending} work order(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Overdue Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-2xl font-semibold text-red-600">{formatCurrency(stats.overdueAmount)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{stats.overdue} work order(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              Paid Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <div className="text-2xl font-semibold text-blue-600">{stats.paid}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Out of {stats.total} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-payments">All Payments</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overduePayments.length})</TabsTrigger>
          <TabsTrigger value="by-client">By Client</TabsTrigger>
          <TabsTrigger value="by-slot">By Slot</TabsTrigger>
        </TabsList>

        <TabsContent value="all-payments" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search client or WO #"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Types</SelectItem>
                    <SelectItem value="full">Prepayment</SelectItem>
                    <SelectItem value="installment">Installments</SelectItem>
                    <SelectItem value="pay_later">Postpayment</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="due_soon">Due Soon</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((clientId) => {
                      const payment = paymentData.find((p) => p.clientId === clientId);
                      return (
                        <SelectItem key={clientId} value={clientId.toString()}>
                          {payment?.clientName || `Client #${clientId}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Track all payments with status and due dates</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No payments found.</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>WO #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Payment Type</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.workOrderId}>
                          <TableCell className="font-medium">#{payment.workOrderId}</TableCell>
                          <TableCell>{payment.clientName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.paymentMode === "full"
                                ? "Prepayment"
                                : payment.paymentMode === "installment"
                                  ? "Installments"
                                  : "Postpayment"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(payment.totalAmount)}</TableCell>
                          <TableCell className="text-emerald-600 font-medium">
                            {formatCurrency(payment.paidAmount)}
                          </TableCell>
                          <TableCell className="text-orange-600 font-medium">
                            {formatCurrency(payment.pendingAmount)}
                          </TableCell>
                          <TableCell>
                            {payment.dueDate ? (
                              <div>
                                <div>{new Date(payment.dueDate).toLocaleDateString()}</div>
                                {payment.daysOverdue > 0 && (
                                  <div className="text-xs text-red-600">{payment.daysOverdue} days overdue</div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                payment.paymentStatus === "paid"
                                  ? "default"
                                  : payment.paymentStatus === "overdue"
                                    ? "destructive"
                                    : payment.paymentStatus === "due_soon"
                                      ? "secondary"
                                      : "outline"
                              }
                            >
                              {payment.paymentStatus === "paid"
                                ? "Paid"
                                : payment.paymentStatus === "overdue"
                                  ? "Overdue"
                                  : payment.paymentStatus === "due_soon"
                                    ? "Due Soon"
                                    : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Overdue Payments
              </CardTitle>
              <CardDescription>Payments that have passed their due date</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : overduePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No overdue payments.</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>WO #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Overdue Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overduePayments.map((payment) => (
                        <TableRow key={payment.workOrderId}>
                          <TableCell className="font-medium">#{payment.workOrderId}</TableCell>
                          <TableCell>{payment.clientName}</TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            {formatCurrency(payment.pendingAmount)}
                          </TableCell>
                          <TableCell>
                            {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">{payment.daysOverdue} days</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-client" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Payment Report by Client
              </CardTitle>
              <CardDescription>Detailed payment breakdown per client</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : paymentsByClient.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No client data available.</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Work Orders</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Payment Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsByClient.map((client, index) => {
                        const paymentRate = client.total > 0 ? (client.paid / client.total) * 100 : 0;
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{client.count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(client.total)}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {formatCurrency(client.paid)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600 font-medium">
                              {formatCurrency(client.pending)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={paymentRate === 100 ? "default" : "outline"}>
                                {paymentRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-slot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Payment Report by Slot
              </CardTitle>
              <CardDescription>Detailed payment breakdown per slot</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : paymentsBySlot.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No slot data available.</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Slot ID</TableHead>
                        <TableHead>Media Type</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Payment Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsBySlot.map((slot, index) => {
                        const paymentRate = slot.total > 0 ? (slot.paid / slot.total) * 100 : 0;
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">#{slot.slotId}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{humanize(slot.mediaType)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{slot.count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(slot.total)}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {formatCurrency(slot.paid)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600 font-medium">
                              {formatCurrency(slot.pending)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={paymentRate === 100 ? "default" : "outline"}>
                                {paymentRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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


