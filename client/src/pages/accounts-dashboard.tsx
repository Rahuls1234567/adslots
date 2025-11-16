import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";

interface Invoice {
  id: number;
  workOrderId: number | null;
  customWorkOrderId: string | null;
  amount: string;
  status: string;
  invoiceType?: string;
  fileUrl?: string | null;
  dueDate?: string | null;
}

export default function AccountsDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const { data: workOrders = [] } = useQuery<Array<{ workOrder: any; items: any[] }>>({
    queryKey: ["/api/work-orders"],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: acceptedReleaseOrders = [] } = useQuery<Array<{ releaseOrder: any; items: any[] }>>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });

  const purchaseOrders = useMemo(() => {
    return workOrders
      .filter(({ workOrder }) => !!workOrder.poUrl)
      .map(({ workOrder, items }) => {
        // Filter invoices by customWorkOrderId (primary) or workOrderId (legacy fallback)
        const orderInvoices = invoices.filter((inv) => {
          // Primary: Match by customWorkOrderId if both exist
          if (workOrder.customWorkOrderId && inv.customWorkOrderId) {
            return inv.customWorkOrderId === workOrder.customWorkOrderId;
          }
          // Fallback: Match by workOrderId (legacy support)
          if (inv.workOrderId !== null && inv.workOrderId !== undefined) {
            return inv.workOrderId === workOrder.id;
          }
          return false;
        });
        const proformaInvoice = orderInvoices.find((inv) => inv.invoiceType === "proforma");
        const hasInvoices = orderInvoices.length > 0;
        const isPaid = hasInvoices && orderInvoices.every((inv) => inv.status === "completed");
        return {
          id: workOrder.id,
          customWorkOrderId: workOrder.customWorkOrderId || null,
          poFile: workOrder.poUrl as string,
          clientName: workOrder.businessSchoolName || `Client #${workOrder.clientId}`,
          createdAt: workOrder.createdAt,
          amount: Number(workOrder.totalAmount ?? 0),
          paymentMode: workOrder.paymentMode,
          paymentStatus: isPaid ? "Paid" : "Not Paid",
          invoices: orderInvoices,
          proforma: proformaInvoice || null,
          items,
        };
      })
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [workOrders, invoices]);

  const paidPOs = useMemo(() => {
    return purchaseOrders
      .filter((po) => po.paymentStatus === "Paid")
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [purchaseOrders]);

  const unpaidPOs = useMemo(() => {
    return purchaseOrders
      .filter((po) => po.paymentStatus !== "Paid")
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [purchaseOrders]);

  const handleUploadProforma = async (workOrderId: number | string, file: File) => {
    try {
      // Use workOrder.id (integer) for uploading state to match original behavior
      const workOrderIntId = typeof workOrderId === 'string' 
        ? workOrders.find(wo => wo.workOrder.customWorkOrderId === workOrderId)?.workOrder?.id 
        : workOrderId;
      
      if (workOrderIntId) {
        setUploadingId(workOrderIntId);
      }
      
      const form = new FormData();
      form.append("file", file);
      if (user?.id) {
        form.append("actorId", String(user.id));
      }
      const res = await fetch(`/api/work-orders/${workOrderId}/upload-proforma`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      toast({ title: "Proforma uploaded", description: "Payment card is now available to the client." });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold">Accounts Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track purchase orders and payment status</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidPOs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Not Paid Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unpaidPOs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Accepted R.O.</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{acceptedReleaseOrders.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Purchase Orders • Not Paid</h2>
            {unpaidPOs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No outstanding payments. All purchase orders are paid.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {unpaidPOs.map((po) => (
                  <Card key={`po-unpaid-${po.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>PO • {po.customWorkOrderId || `WO #${po.id}`}</CardTitle>
                        <CardDescription>{new Date(po.createdAt).toLocaleString()}</CardDescription>
                      </div>
                      <Badge variant="destructive">{po.paymentStatus}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Client</span>
                        <span className="font-medium text-right ml-4 truncate max-w-[200px]">{po.clientName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Order Amount</span>
                        <span className="font-medium">₹{po.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Payment Type</span>
                        <span className="font-medium capitalize">{(po.paymentMode || "—").replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/uploads/${po.poFile}`, "_blank", "noopener")}
                        >
                          View PO
                        </Button>
                        {po.proforma ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(po.proforma.fileUrl || `/api/invoices/${po.proforma.id}/pdf`, "_blank", "noopener")}
                          >
                            Download Proforma
                          </Button>
                        ) : null}
                        <div className="relative">
                          <input
                            id={`proforma-upload-${po.id}`}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Use customWorkOrderId for API call if available, otherwise use id
                                handleUploadProforma(po.customWorkOrderId || po.id, file);
                                e.target.value = "";
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => document.getElementById(`proforma-upload-${po.id}`)?.click()}
                            disabled={uploadingId === po.id}
                          >
                            {uploadingId === po.id
                              ? "Uploading…"
                              : po.proforma
                              ? "Replace Proforma"
                              : "Upload Proforma"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Purchase Orders • Paid</h2>
            {paidPOs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No paid purchase orders yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {paidPOs.map((po) => (
                  <Card key={`po-paid-${po.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>PO • {po.customWorkOrderId || `WO #${po.id}`}</CardTitle>
                        <CardDescription>{new Date(po.createdAt).toLocaleString()}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                        Paid
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Client</span>
                        <span className="font-medium text-right ml-4 truncate max-w-[200px]">{po.clientName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Order Amount</span>
                        <span className="font-medium">₹{po.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/uploads/${po.poFile}`, "_blank", "noopener")}
                        >
                          View PO
                        </Button>
                        {po.proforma ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(po.proforma.fileUrl || `/api/invoices/${po.proforma.id}/pdf`, "_blank", "noopener")}
                          >
                            Download Proforma
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
