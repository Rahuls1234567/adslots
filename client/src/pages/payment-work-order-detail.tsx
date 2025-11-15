import { useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

type WorkOrder = {
  id: number;
  clientId: number;
  businessSchoolName?: string | null;
  contactName?: string | null;
  status: string;
  totalAmount: string;
  createdAt: string;
  poUrl?: string | null;
  paymentMode?: string | null;
  gstPercent?: string | null;
  createdByName?: string | null;
  createdOnDate?: string | null;
  createdOnTime?: string | null;
  quotedById?: number | null;
};

export default function PaymentWorkOrderDetailPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loc] = useLocation();
  const idStr = useMemo(() => loc.split("/").pop() || "", [loc]);
  // Check if it's a custom work order ID (starts with WO) or an integer ID
  const isCustomId = idStr.startsWith('WO');
  const workOrderId = isCustomId ? idStr : Number(idStr);

  const { data: workOrderResponse, isLoading: workOrderLoading, refetch } = useQuery<{ workOrder: WorkOrder; items: any[]; releaseOrderId: number | null; releaseOrderStatus: string | null }>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: isCustomId ? !!idStr : Number.isFinite(workOrderId as number),
  });

  const workOrder = workOrderResponse?.workOrder;
  const items = workOrderResponse?.items ?? [];
  const releaseOrderId = workOrderResponse?.releaseOrderId ?? null;

  const { data: releaseOrderData, isLoading: releaseOrderLoading } = useQuery<{ releaseOrder: any; items: any[]; createdBy?: any; workOrder?: any; client?: any }>({
    queryKey: releaseOrderId ? [`/api/release-orders/${releaseOrderId}`] : [],
    enabled: Number.isFinite(releaseOrderId || NaN),
  });

  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery<any[]>({
    queryKey: (isCustomId ? !!idStr : Number.isFinite(workOrderId as number)) ? [`/api/invoices/work-order/${workOrderId}`] : [],
    enabled: isCustomId ? !!idStr : Number.isFinite(workOrderId as number),
  });

  const proformaInvoice = useMemo(() => invoices.find((inv) => inv.invoiceType === "proforma") ?? invoices[0], [invoices]);

  const payInvoice = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([refetch(), refetchInvoices()]);
      toast({ title: "Payment successful", description: "Payment recorded successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Payment failed", description: err?.message || "Please try again", variant: "destructive" });
    },
  });

  const subtotal = useMemo(() => items.reduce((sum: number, it: any) => sum + Number(it?.subtotal ?? it?.unitPrice ?? 0), 0), [items]);
  const gstPercent = Number((workOrder as any)?.gstPercent ?? 0);
  const gstAmount = subtotal * (Number.isFinite(gstPercent) ? gstPercent : 0) / 100;
  const totalAmount = subtotal + gstAmount;

  const PageLoader = (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );

  if (workOrderLoading) {
    return PageLoader;
  }

  if (!workOrder) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Work Order</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Work Order not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const releaseOrder = releaseOrderData?.releaseOrder;
  const releaseOrderItems = releaseOrderData?.items ?? [];

  const stageTimeline: Array<{ label: string; status: string; timestamp?: string | null }> = [
    { label: "Work Order Status", status: workOrder.status, timestamp: workOrder.createdAt },
  ];
  if (releaseOrder) {
    stageTimeline.push({
      label: "Release Order Stage",
      status: releaseOrder.status,
      timestamp: releaseOrder.updatedAt ?? releaseOrder.issuedAt,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Overview • Work Order {workOrder.customWorkOrderId || `#${workOrder.id}`}</h1>
          <p className="text-muted-foreground">
            Created {new Date(workOrder.createdAt).toLocaleString()}
            {workOrder.createdByName ? ` • ${workOrder.createdByName}` : ""}
          </p>
        </div>
        <Badge variant="secondary">{String(workOrder.status).replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Order Summary</CardTitle>
              <CardDescription>Snapshot of the request and billing details</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Business School</div>
                <div className="font-medium">{workOrder.businessSchoolName || "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Contact Name</div>
                <div className="font-medium">{workOrder.contactName || "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Payment Type</div>
                <div className="font-medium">
                  {workOrder.paymentMode === "full"
                    ? "Prepayment"
                    : workOrder.paymentMode === "pay_later"
                    ? "Postpayment"
                    : workOrder.paymentMode === "installment"
                    ? "Installments"
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">GST (%)</div>
                <div className="font-medium">{gstPercent}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total (incl. GST)</div>
                <div className="font-medium">₹{Number(workOrder.totalAmount ?? totalAmount).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">PO</div>
                {workOrder.poUrl ? (
                  <a className="underline" href={`/uploads/${workOrder.poUrl}`} target="_blank" rel="noreferrer">
                    View PO
                  </a>
                ) : (
                  <div>—</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Slots, campaigns, and add-ons covered in this work order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <div className="text-sm text-muted-foreground">No items found.</div>
              ) : (
                items.map((item: any) => {
                  const label = item.addonType
                    ? item.addonType === "email"
                      ? "Email Campaign"
                      : "WhatsApp Campaign"
                    : item.slot
                    ? `${item.slot.mediaType} • ${item.slot.pageType} • ${item.slot.position}`
                    : `Slot ${item.customSlotId || item.slot?.slotId || (item.slotId ? `#${item.slotId}` : 'Unknown')}`;
                  return (
                    <div key={item.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                      <div className="space-y-0.5">
                        <div className="font-medium">{label}</div>
                        <div className="text-muted-foreground">
                          {item.startDate} → {item.endDate}
                        </div>
                      </div>
                      <div className="text-right text-muted-foreground">
                        ₹{Number(item.subtotal ?? item.unitPrice).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GST ({gstPercent}%)</span>
                <span className="font-medium">₹{gstAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Due</span>
                <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Timeline</CardTitle>
              <CardDescription>Track approvals and release order progression</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stageTimeline.map((stage, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded-md p-3 text-sm">
                  <div>
                    <div className="font-medium">{stage.label}</div>
                    <div className="text-muted-foreground capitalize">{stage.status.replace(/_/g, " ")}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stage.timestamp ? new Date(stage.timestamp).toLocaleString() : ""}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoices & Payment</CardTitle>
              <CardDescription>Review proforma and settle outstanding dues</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoicesLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : invoices.length === 0 ? (
                <div className="text-sm text-muted-foreground">Invoices will appear here once generated.</div>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="space-y-2 rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        Invoice #{invoice.id} • {invoice.invoiceType?.replace(/_/g, " ")}
                      </div>
                      <Badge variant={invoice.status === "completed" ? "default" : "outline"}>
                        {invoice.status === "completed" ? "Paid" : "Not Paid"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Amount</span>
                      <span>₹{Number(invoice.amount).toLocaleString()}</span>
                    </div>
                    {invoice.dueDate && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Due Date</span>
                        <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(invoice.fileUrl || `/api/invoices/${invoice.id}/pdf`, "_blank", "noopener")}
                      >
                        Download PDF
                      </Button>
                      {invoice.status !== "completed" && (
                        <Button
                          size="sm"
                          onClick={() => payInvoice.mutate(invoice.id)}
                          disabled={payInvoice.isPending}
                        >
                          {payInvoice.isPending ? "Processing…" : "Pay Now"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {proformaInvoice && invoices.length > 1 && (
                <div className="text-xs text-muted-foreground">
                  Latest proforma: #{proformaInvoice.id} • ₹{Number(proformaInvoice.amount).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Release Order Snapshot</CardTitle>
              <CardDescription>Details on deployment readiness</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {releaseOrderLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !releaseOrder ? (
                <div className="text-muted-foreground">Release order will appear here after approvals.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">RO Number</span>
                    <span className="font-medium">{releaseOrder.customRoNumber || releaseOrder.roNumber || `RO-${releaseOrder.id}`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="secondary">{String(releaseOrder.status).replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(releaseOrder.issuedAt).toLocaleString()}</span>
                  </div>
                  {releaseOrderData?.createdBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Issued By</span>
                      <span>{releaseOrderData.createdBy.name}</span>
                    </div>
                  )}
                  {releaseOrderItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-muted-foreground">Items</div>
                      <ul className="space-y-1 text-xs">
                        {releaseOrderItems.map((it: any) => (
                          <li key={it.id} className="border rounded p-2">
                            {it.slot
                              ? `${it.slot.mediaType} • ${it.slot.pageType} • ${it.slot.position}`
                              : `Work Order Item #${it.workOrderItemId}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


