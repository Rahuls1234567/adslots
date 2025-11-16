import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
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
  CheckCircle2,
  FileText,
  TrendingUp,
  Users,
  Package,
  Calendar,
  Search,
  ArrowRight,
  CreditCard,
  Receipt,
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
  const navigate = useLocation()[1];
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
        
        // Get payment status - more accurate calculation
        // Payment is "paid" if all invoices are completed (status === "completed")
        // AND paid amount >= total amount (with small tolerance for rounding)
        const allInvoicesPaid = woInvoices.length > 0 && woInvoices.every((inv) => inv.status === "completed");
        const amountFullyPaid = Math.abs(paidAmount - totalAmount) < 0.01; // Allow small rounding differences
        
        let paymentStatus: "paid" | "pending" | "overdue" | "due_soon" = "pending";
        if (allInvoicesPaid && amountFullyPaid) {
          paymentStatus = "paid";
        } else if (isOverdue) {
          paymentStatus = "overdue";
        } else if (isDueSoon) {
          paymentStatus = "due_soon";
        }

        return {
          workOrderId: wo.id,
          customWorkOrderId: wo.customWorkOrderId || null,
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
          createdAt: wo.createdAt,
          workOrderStatus: wo.status,
        };
      })
      .sort((a, b) => {
        // Sort by creation date (newest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [workOrdersData, invoices, releaseOrders]);

  // Filter payment data
  const filteredPayments = useMemo(() => {
    return paymentData.filter((payment) => {
      const searchLower = searchTerm.toLowerCase();
      const workOrderIdStr = payment.customWorkOrderId || `WO #${payment.workOrderId}` || payment.workOrderId.toString();
      if (searchTerm && 
          !payment.clientName.toLowerCase().includes(searchLower) && 
          !workOrderIdStr.toLowerCase().includes(searchLower)) {
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
    return paymentData.filter((p) => p.isOverdue).sort((a, b) => b.daysOverdue - a.daysOverdue);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800",
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
          label: "Paid",
        };
      case "overdue":
        return {
          variant: "destructive" as const,
          className: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800",
          icon: <AlertTriangle className="w-3 h-3 mr-1" />,
          label: "Overdue",
        };
      case "due_soon":
        return {
          variant: "secondary" as const,
          className: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800",
          icon: <Clock className="w-3 h-3 mr-1" />,
          label: "Due Soon",
        };
      default:
        return {
          variant: "outline" as const,
          className: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800",
          icon: <Clock className="w-3 h-3 mr-1" />,
          label: "Pending",
        };
    }
  };

  // Early return if still loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <div className="flex-shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background backdrop-blur-sm border-b px-6 py-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              Payment Tracking & Reports
            </h1>
            <p className="text-muted-foreground text-base">
              Track payments, receive alerts for overdue payments, and access detailed reports per client and slot.
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background backdrop-blur-sm border-b px-6 py-8 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            Payment Tracking & Reports
          </h1>
          <p className="text-muted-foreground text-base">
            Track payments, receive alerts for overdue payments, and access detailed reports per client and slot.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Alerts for Overdue/Missed Payments */}
        {(overduePayments.length > 0 || dueSoonPayments.length > 0) && (
          <div className="space-y-3">
            {overduePayments.length > 0 && (
              <Alert variant="destructive" className="border-2">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="font-bold">Overdue Payments Alert</AlertTitle>
                <AlertDescription className="text-base">
                  {overduePayments.length} payment(s) are overdue. Total overdue amount:{" "}
                  <span className="font-bold">{formatCurrency(overduePayments.reduce((sum, p) => sum + p.pendingAmount, 0))}</span>
                </AlertDescription>
              </Alert>
            )}
            {dueSoonPayments.length > 0 && (
              <Alert className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <Clock className="h-5 w-5 text-orange-600" />
                <AlertTitle className="font-bold text-orange-900 dark:text-orange-100">Payments Due Soon</AlertTitle>
                <AlertDescription className="text-base text-orange-800 dark:text-orange-200">
                  {dueSoonPayments.length} payment(s) are due today or soon. Total amount:{" "}
                  <span className="font-bold">{formatCurrency(dueSoonPayments.reduce((sum, p) => sum + p.pendingAmount, 0))}</span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                Total Payments Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.paidAmount)}</div>
              <p className="text-xs text-muted-foreground mt-2">Out of {formatCurrency(stats.totalAmount)}</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{formatCurrency(stats.pendingAmount)}</div>
              <p className="text-xs text-muted-foreground mt-2">{stats.pending} work order(s)</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                Overdue Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</div>
              <p className="text-xs text-muted-foreground mt-2">{stats.overdue} work order(s)</p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                Paid Work Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.paid}</div>
              <p className="text-xs text-muted-foreground mt-2">Out of {stats.total} total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all-payments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all-payments">All Payments</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({overduePayments.length})</TabsTrigger>
            <TabsTrigger value="by-client">By Client</TabsTrigger>
            <TabsTrigger value="by-slot">By Slot</TabsTrigger>
          </TabsList>

          <TabsContent value="all-payments" className="space-y-4">
            {/* Filters */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search client or WO #"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-11"
                    />
                  </div>
                  <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                    <SelectTrigger className="h-11">
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
                    <SelectTrigger className="h-11">
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
                    <SelectTrigger className="h-11">
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

            {/* Payment Cards */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-base font-medium text-foreground">No payments found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPayments.map((payment) => {
                  const statusBadge = getStatusBadge(payment.paymentStatus);
                  const workOrderId = payment.customWorkOrderId || `WO #${payment.workOrderId}`;
                  const paymentProgress = payment.totalAmount > 0 ? (payment.paidAmount / payment.totalAmount) * 100 : 0;

                  return (
                    <Card
                      key={payment.workOrderId}
                      className="border-2 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/20 group"
                      onClick={() => navigate(`/work-orders/${payment.customWorkOrderId || payment.workOrderId}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-row items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Receipt className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold">{workOrderId}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                  <Users className="w-3 h-3" />
                                  <span>{payment.clientName}</span>
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {payment.paymentMode === "full"
                                  ? "Prepayment"
                                  : payment.paymentMode === "installment"
                                    ? "Installments"
                                    : "Postpayment"}
                              </Badge>
                            </div>
                          </div>
                          <Badge
                            variant={statusBadge.variant}
                            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold ${statusBadge.className}`}
                          >
                            {statusBadge.icon}
                            <span>{statusBadge.label}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span className="font-bold text-lg">{formatCurrency(payment.totalAmount)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Paid</span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(payment.paidAmount)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Pending</span>
                            <span className="font-semibold text-orange-600">{formatCurrency(payment.pendingAmount)}</span>
                          </div>
                          {payment.dueDate && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Due Date</span>
                              <span className={`font-medium ${payment.isOverdue ? 'text-red-600' : payment.isDueSoon ? 'text-orange-600' : ''}`}>
                                {new Date(payment.dueDate).toLocaleDateString()}
                                {payment.daysOverdue > 0 && (
                                  <span className="ml-2 text-xs">({payment.daysOverdue} days overdue)</span>
                                )}
                              </span>
                            </div>
                          )}
                          <div className="pt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Payment Progress</span>
                              <span className="font-medium">{paymentProgress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end pt-2 border-t">
                          <span className="text-sm text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                            View details
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
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
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-base font-medium text-foreground">No overdue payments</p>
                      <p className="text-sm text-muted-foreground">All payments are up to date</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overduePayments.map((payment) => {
                      const workOrderId = payment.customWorkOrderId || `WO #${payment.workOrderId}`;
                      return (
                        <Card
                          key={payment.workOrderId}
                          className="border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => navigate(`/work-orders/${payment.customWorkOrderId || payment.workOrderId}`)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg">{workOrderId}</span>
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {payment.daysOverdue} days overdue
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{payment.clientName}</p>
                                {payment.dueDate && (
                                  <p className="text-xs text-muted-foreground">
                                    Due: {new Date(payment.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(payment.pendingAmount)}</div>
                                <p className="text-xs text-muted-foreground">Overdue amount</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-client" className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
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
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-medium text-foreground">No client data available</p>
                    </div>
                  </div>
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
                              <TableCell className="text-right font-semibold">{formatCurrency(client.total)}</TableCell>
                              <TableCell className="text-right text-emerald-600 font-medium">
                                {formatCurrency(client.paid)}
                              </TableCell>
                              <TableCell className="text-right text-orange-600 font-medium">
                                {formatCurrency(client.pending)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={paymentRate === 100 ? "default" : "outline"} className={paymentRate === 100 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : ""}>
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
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
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
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-medium text-foreground">No slot data available</p>
                    </div>
                  </div>
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
                              <TableCell className="text-right font-semibold">{formatCurrency(slot.total)}</TableCell>
                              <TableCell className="text-right text-emerald-600 font-medium">
                                {formatCurrency(slot.paid)}
                              </TableCell>
                              <TableCell className="text-right text-orange-600 font-medium">
                                {formatCurrency(slot.pending)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={paymentRate === 100 ? "default" : "outline"} className={paymentRate === 100 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : ""}>
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
    </div>
  );
}
