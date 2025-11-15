import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

export default function ClientBookings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<{ workOrder: any; items: any[] }[]>({
    queryKey: ["/api/work-orders", { clientId: user?.id }],
    enabled: !!user?.id,
  });

  const sorted = useMemo(
    () => (data || []).slice().sort((a, b) => (new Date(b.workOrder.createdAt).getTime() - new Date(a.workOrder.createdAt).getTime())),
    [data]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">Track the status of your requests and bookings</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground">No work orders yet. Select slots (including Email/WhatsApp) and raise a request from the dashboard.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(({ workOrder, items }) => (
            <WorkOrderCard key={workOrder.id} workOrder={workOrder} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkOrderCard({ workOrder, items }: { workOrder: any; items: any[] }) {
  const [, navigate] = useLocation();
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: [`/api/invoices/work-order/${workOrder.id}`],
  });

  // Check if proforma invoice exists (uploaded by accounts)
  const proformaInvoice = invoices.find((inv) => inv.invoiceType === "proforma");
  const hasProformaInvoice = !!proformaInvoice;
  
  // Check if payment is completed
  const paymentCompleted = proformaInvoice?.status === 'completed' || workOrder.status === 'paid';
  
  // Check if all banners are uploaded (excluding addons)
  const slotItems = items.filter((it: any) => !it.addonType);
  const allBannersUploaded = slotItems.length > 0 && slotItems.every((it: any) => it.bannerUrl);
  
  // Only show "upload banner pending" if:
  // 1. Payment is completed
  // 2. Banners are NOT uploaded
  // 3. There are slots that need banners
  const hasBannersPending = paymentCompleted && !allBannersUploaded && slotItems.length > 0;
  
  // Banner upload is available when:
  // 1. Work order status is 'client_accepted' or 'paid'
  // 2. Proforma invoice exists (uploaded by accounts)
  const canUploadBanners = (workOrder.status === 'client_accepted' || workOrder.status === 'paid') && hasProformaInvoice;

  return (
    <Card className="hover:shadow-sm transition cursor-pointer" onClick={() => navigate(`/work-orders/${workOrder.customWorkOrderId || workOrder.id}`)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{workOrder.customWorkOrderId || `Work Order #${workOrder.id}`}</CardTitle>
          <CardDescription>
            {new Date(workOrder.createdAt).toLocaleString()} • {items.length} item{items.length !== 1 ? "s" : ""}
          </CardDescription>
        </div>
        <Badge variant={workOrder.status === 'draft' ? 'secondary' : workOrder.status === 'paid' || workOrder.status === 'active' ? 'default' : 'outline'}>
          {String(workOrder.status).replace(/_/g, " ")}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {invoicesLoading ? (
            <span>Loading invoice information...</span>
          ) : hasBannersPending ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-orange-600 font-medium">Upload banner pending</span>
                <div className="text-xs text-muted-foreground">
                  Payment completed. Please upload banners for all slots.
                </div>
              </div>
              <Button size="sm" onClick={(e) => {
                e.stopPropagation();
                navigate(`/work-orders/${workOrder.customWorkOrderId || workOrder.id}`);
              }}>
                Upload Banners
              </Button>
            </div>
          ) : canUploadBanners ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-green-600 font-medium">Proforma invoice available - Banners can now be uploaded</span>
                {proformaInvoice && (
                  <div className="text-xs text-muted-foreground">
                    Invoice #{proformaInvoice.id} • ₹{Number(proformaInvoice.amount).toLocaleString()}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={(e) => {
                e.stopPropagation();
                navigate(`/work-orders/${workOrder.customWorkOrderId || workOrder.id}`);
              }}>
                Upload Banners
              </Button>
            </div>
          ) : workOrder.poApproved && !hasProformaInvoice ? (
            <span className="text-amber-600">PO approved. Proforma invoice will appear here once accounts uploads it.</span>
          ) : (
            <span>Click to view details</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

