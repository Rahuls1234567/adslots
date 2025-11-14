import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ClipboardCheck, CheckCircle, BookmarkCheck, Info, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ReleaseOrderEntry {
  releaseOrder: any;
  items: any[];
  workOrder?: any;
  client?: any;
  createdBy?: any;
}

const formatCurrency = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  return `₹${num.toLocaleString()}`;
};

const humanize = (value?: string | null) => (value ? value.replace(/_/g, " ") : "");

export default function VPDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEntry, setSelectedEntry] = useState<ReleaseOrderEntry | null>(null);
  const [rejectEntry, setRejectEntry] = useState<ReleaseOrderEntry | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: pending = [], isLoading: loadingPending } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "pending_vp_review" }],
  });

  const { data: vpAccepted = [] } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "pending_pv_review" }],
  });

  const { data: fullyAccepted = [] } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });

  // Fetch orders rejected by the current VP user from backend
  const { data: rejectedByVP = [], isLoading: loadingRejected } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { rejectedById: user?.id?.toString() }],
    enabled: !!user?.id,
  });

  const approveMutation = useMutation({
    mutationFn: async (releaseOrderId: number) => {
      const res = await fetch(`/api/release-orders/${releaseOrderId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user?.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "pending_vp_review" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "pending_pv_review" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "accepted" }] });
      toast({ title: "Release Order approved", description: "Sent to PV Sir for final approval." });
    },
    onError: (error: any) => {
      toast({
        title: "Approval failed",
        description: error?.message || "Could not update the release order",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ releaseOrderId, reason }: { releaseOrderId: number; reason: string }) => {
      const res = await fetch(`/api/release-orders/${releaseOrderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user?.id, reason }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "pending_vp_review" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "pending_pv_review" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { rejectedById: user?.id?.toString() }] });
      toast({ title: "Release Order rejected", description: "Managers have been notified to revise the request." });
      setRejectEntry(null);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Rejection failed",
        description: error?.message || "Could not update the release order",
        variant: "destructive",
      });
    },
  });

  const renderPrimaryDetails = (entry: ReleaseOrderEntry, onViewDetails?: () => void) => {
    const { releaseOrder, workOrder, client, createdBy } = entry;
    const totalAmount = formatCurrency(workOrder?.totalAmount);
    const paymentType = workOrder?.paymentMode ? humanize(workOrder.paymentMode) : "—";
    const paymentStatus = humanize(releaseOrder.paymentStatus);
    const createdAt = releaseOrder.issuedAt ? new Date(releaseOrder.issuedAt).toLocaleString() : "—";

    return (
      <div className="grid gap-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-muted-foreground">Business School</div>
            <div className="font-medium">{workOrder?.businessSchoolName || client?.businessSchoolName || client?.name || `Client #${workOrder?.clientId}`}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Client</div>
            <div className="font-medium">{client?.name || workOrder?.contactName || `Client #${workOrder?.clientId}`}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-muted-foreground">Order Amount</div>
            <div className="font-medium">{totalAmount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Payment Type</div>
            <div className="font-medium capitalize">{paymentType}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-muted-foreground">Payment Status</div>
            <div className={releaseOrder.paymentStatus === "completed" ? "font-medium text-emerald-600" : "font-medium text-orange-600"}>
              {paymentStatus || "Unknown"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Created / Issued</div>
            <div className="font-medium">{createdAt}</div>
            {createdBy?.name ? <div className="text-xs text-muted-foreground">By {createdBy.name}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground">Purchase Order</div>
          {workOrder?.poUrl ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                if (onViewDetails) {
                  onViewDetails();
                } else {
                  window.open(`/uploads/${workOrder.poUrl}`, "_blank", "noopener");
                }
              }}
              className="gap-2"
            >
              <Info className="h-4 w-4" />
              Info
            </Button>
          ) : (
            <div>Not uploaded</div>
          )}
        </div>
      {releaseOrder.rejectionReason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
          <div className="font-semibold">
            {releaseOrder.status === "pending_vp_review" ? "Rejected by PV Sir" : "Rejection Note"}
          </div>
          <div className="mt-1 whitespace-pre-wrap">{releaseOrder.rejectionReason}</div>
          {releaseOrder.rejectedAt && (
            <div className="text-xs mt-2 text-destructive/80">
              Rejected on {new Date(releaseOrder.rejectedAt).toLocaleString()}
            </div>
          )}
          {releaseOrder.rejectedById && (
            <div className="text-xs mt-1 text-destructive/70">
              Status: {humanize(releaseOrder.status)}
            </div>
          )}
        </div>
      )}
      </div>
    );
  };

  const renderReleaseOrders = (rows: ReleaseOrderEntry[], showActions = false) => {
    if (rows.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No release orders to display.</CardContent>
        </Card>
      );
    }

    return rows.map((entry) => (
      <Card
        key={entry.releaseOrder.id}
        className="cursor-pointer hover:shadow-md transition"
        onClick={() => setSelectedEntry(entry)}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Release Order #{entry.releaseOrder.id}</CardTitle>
            <CardDescription>WO #{entry.releaseOrder.workOrderId} • {formatCurrency(entry.workOrder?.totalAmount)}</CardDescription>
          </div>
          <Badge variant="secondary" className="capitalize">{humanize(entry.releaseOrder.status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderPrimaryDetails(entry, () => setSelectedEntry(entry))}

          {showActions && (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectEntry(entry);
                  setRejectReason("");
                }}
                disabled={rejectMutation.isPending}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  approveMutation.mutate(entry.releaseOrder.id);
                }}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? "Approving…" : "Approve & Send to PV Sir"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    ));
  };

  const pendingCount = pending.length;
  const vpAcceptedCount = vpAccepted.length;
  const rejectedCount = rejectedByVP.length;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-vp-dashboard-title">VP Dashboard</h1>
        <p className="text-muted-foreground">Review and approve release orders escalated by managers</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending VP Approval</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Waiting for your review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved (Sent to PV Sir)</CardTitle>
            <BookmarkCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vpAcceptedCount}</div>
            <p className="text-xs text-muted-foreground">Release orders you already approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Release orders you rejected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="accepted" data-testid="tab-accepted">
            Approved ({vpAcceptedCount})
          </TabsTrigger>
          <TabsTrigger value="reject" data-testid="tab-reject">
            Reject ({rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loadingPending ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            renderReleaseOrders(pending, true)
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {renderReleaseOrders(
            vpAccepted.map((entry) => ({
              ...entry,
              releaseOrder: { ...entry.releaseOrder, status: "accepted" },
            })),
            false
          )}
        </TabsContent>

        <TabsContent value="reject" className="space-y-4">
          {loadingRejected ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            renderReleaseOrders(rejectedByVP, false)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Release Order Details</DialogTitle>
          </DialogHeader>
          {selectedEntry ? (
            <div className="space-y-6 text-sm">
              {renderPrimaryDetails(selectedEntry)}
              <div className="space-y-2">
                <div className="text-muted-foreground">Campaign Items</div>
                <div className="space-y-2 max-h-60 overflow-auto border rounded p-3 bg-muted/40">
                  {selectedEntry.items.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No items linked to this release order.</div>
                  ) : (
                    selectedEntry.items.map((item) => (
                      <div key={item.id} className="border rounded-md p-2 text-xs">
                        <div className="font-medium">
                          {item.slot
                            ? `${item.slot.mediaType} • ${item.slot.pageType} • ${item.slot.position}`
                            : `Work Order Item #${item.workOrderItemId}`}
                        </div>
                        <div className="text-muted-foreground">
                          {item.startDate} → {item.endDate}
                        </div>
                        {item.bannerUrl ? (
                          <Button
                            variant="link"
                            className="h-auto p-0"
                            onClick={() => window.open(item.bannerUrl, "_blank", "noopener")}
                          >
                            View Banner
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectEntry} onOpenChange={(open) => { if (!open) { setRejectEntry(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Release Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Provide a brief note so the manager knows what to revise before resubmitting.
            </p>
            {rejectEntry?.releaseOrder?.rejectionReason && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                <div className="font-semibold">Previous note</div>
                <div className="mt-1 whitespace-pre-wrap">{rejectEntry.releaseOrder.rejectionReason}</div>
              </div>
            )}
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason for rejection"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectEntry(null); setRejectReason(""); }} disabled={rejectMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectEntry && rejectMutation.mutate({ releaseOrderId: rejectEntry.releaseOrder.id, reason: rejectReason })}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
