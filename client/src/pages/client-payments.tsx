import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View invoices and complete payments</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !sortedData || sortedData.length === 0 ? (
        <p className="text-muted-foreground">No payments found.</p>
      ) : (
        <div className="space-y-3">
          {sortedData.map(({ workOrder }) => (
            <WorkOrderInvoices key={workOrder.id} workOrder={workOrder} onPaid={() => toast({ title: 'Payment successful' })} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkOrderInvoices({ workOrder, onPaid }: { workOrder: any; onPaid: () => void }) {
  const [, navigate] = useLocation();
  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/invoices/work-order/${workOrder.id}`],
  });
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (invoices.length === 0) return null; // Hide cards without invoices; visible only after Accounts approval
  return (
    <Card onClick={() => navigate(`/payments/work-orders/${workOrder.id}`)} className="cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Work Order #{workOrder.id}</CardTitle>
          <CardDescription>Payment Type: {workOrder.paymentMode === 'full' ? 'Prepayment' : workOrder.paymentMode === 'pay_later' ? 'Postpayment' : 'Installments'}</CardDescription>
        </div>
        <Badge variant="secondary">{String(workOrder.status).replace(/_/g, ' ')}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
            <div className="space-y-0.5">
              <div>Invoice #{inv.id} • ₹{Number(inv.amount).toLocaleString()}</div>
              <div className="text-muted-foreground">Status: {inv.status === 'completed' ? 'Paid' : 'Not Paid'}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(inv.fileUrl || `/api/invoices/${inv.id}/pdf`, "_blank", "noopener");
                }}
              >
                Download PDF
              </Button>
              {inv.status !== 'completed' && (
                <Button size="sm" onClick={async (e) => {
                  e.stopPropagation();
                  await fetch(`/api/invoices/${inv.id}/pay`, { method: 'POST' }).then(r => r.ok ? r.json() : Promise.reject(r));
                  onPaid();
                }}>Pay</Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
