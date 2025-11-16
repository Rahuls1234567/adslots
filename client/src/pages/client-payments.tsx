import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { DollarSign, CheckCircle2, Clock, Download, CreditCard, ArrowRight, Receipt } from "lucide-react";

export default function ClientPayments() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ workOrder: any; items: any[] }[]>({
    queryKey: ["/api/work-orders", { clientId: user?.id }],
    enabled: !!user?.id,
  });

  // Sort work orders by creation date (latest first)
  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const dateA = new Date(a.workOrder.createdAt).getTime();
      const dateB = new Date(b.workOrder.createdAt).getTime();
      return dateB - dateA; // Descending order (latest first)
    });
  }, [data]);

  // Calculate payment statistics
  const stats = useMemo(() => {
    if (!data) return { total: 0, paid: 0, pending: 0, totalAmount: 0 };
    
    let totalInvoices = 0;
    let paidInvoices = 0;
    let pendingInvoices = 0;
    let totalAmount = 0;

    data.forEach(({ workOrder }) => {
      // This will be calculated per work order in the component
      // For now, we'll use work order data
      if (workOrder.status === 'paid' || workOrder.status === 'active') {
        paidInvoices++;
      } else {
        pendingInvoices++;
      }
      if (workOrder.totalAmount) {
        totalAmount += Number(workOrder.totalAmount);
      }
    });

    return {
      total: data.length,
      paid: paidInvoices,
      pending: pendingInvoices,
      totalAmount,
    };
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header Section */}
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground text-base">
              View invoices and complete payments for your work orders
            </p>
          </div>

          {/* Statistics Cards */}
          {!isLoading && data && data.length > 0 && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold mt-1">{stats.total}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paid</p>
                      <p className="text-2xl font-bold mt-1 text-green-600">{stats.paid}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold mt-1 text-orange-600">{stats.pending}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold mt-1 text-blue-600">₹{stats.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : !sortedData || sortedData.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Receipt className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No payments found</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Invoices will appear here once your work orders are approved and invoices are generated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedData.map(({ workOrder }) => (
                <WorkOrderInvoices key={workOrder.id} workOrder={workOrder} onPaid={() => toast({ title: 'Payment successful', description: 'Your payment has been processed successfully.' })} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkOrderInvoices({ workOrder, onPaid }: { workOrder: any; onPaid: () => void }) {
  const [, navigate] = useLocation();
  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/invoices/work-order/${workOrder.customWorkOrderId || workOrder.id}`],
  });
  
  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (invoices.length === 0) return null; // Hide cards without invoices; visible only after Accounts approval

  const paymentType = workOrder.paymentMode === 'full' ? 'Prepayment' : workOrder.paymentMode === 'pay_later' ? 'Postpayment' : 'Installments';
  const workOrderId = workOrder.customWorkOrderId || `Work Order #${workOrder.id}`;
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const paidAmount = invoices.filter(inv => inv.status === 'completed').reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusStr = String(status).replace(/_/g, " ");
    switch (status) {
      case 'paid':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
          icon: <CheckCircle2 className="w-3 h-3" />
        };
      case 'active':
        return {
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
          icon: <CheckCircle2 className="w-3 h-3" />
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
          icon: <Clock className="w-3 h-3" />
        };
    }
  };

  const statusBadge = getStatusBadge(workOrder.status);

  return (
    <Card 
      onClick={() => navigate(`/payments/work-orders/${workOrder.customWorkOrderId || workOrder.id}`)} 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 group"
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
                  <CreditCard className="w-3 h-3" />
                  <span>Payment Type: {paymentType}</span>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>Total: ₹{totalAmount.toLocaleString()}</span>
              </div>
              {paidAmount > 0 && (
                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paid: ₹{paidAmount.toLocaleString()}</span>
                </div>
              )}
              {pendingAmount > 0 && (
                <div className="flex items-center gap-1.5 text-orange-600 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Pending: ₹{pendingAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant={statusBadge.variant}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold ${statusBadge.className}`}
          >
            {statusBadge.icon}
            <span className="capitalize">{String(workOrder.status).replace(/_/g, " ")}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div 
              key={inv.id} 
              className="flex items-center justify-between border-2 rounded-lg p-4 hover:bg-muted/50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  inv.status === 'completed' 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : 'bg-orange-100 dark:bg-orange-900/20'
                }`}>
                  {inv.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Invoice #{inv.id}</span>
                    <span className="text-lg font-bold text-primary">₹{Number(inv.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge 
                      variant={inv.status === 'completed' ? 'default' : 'secondary'}
                      className={`text-xs ${
                        inv.status === 'completed' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                      }`}
                    >
                      {inv.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Paid
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                    {inv.invoiceType && (
                      <span className="text-muted-foreground capitalize">• {inv.invoiceType}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(inv.fileUrl || `/api/invoices/${inv.id}/pdf`, "_blank", "noopener");
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                {inv.status !== 'completed' && (
                  <Button 
                    size="sm" 
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await fetch(`/api/invoices/${inv.id}/pay`, { method: 'POST' }).then(r => r.ok ? r.json() : Promise.reject(r));
                        onPaid();
                      } catch (error) {
                        console.error('Payment failed:', error);
                      }
                    }}
                    className="gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end pt-2 border-t">
          <span className="text-sm text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
            Click to view details
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
