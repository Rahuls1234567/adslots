import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Shield, CheckCircle, Clock, TrendingUp, AlertCircle } from "lucide-react";
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

export default function PVSirDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEntry, setSelectedEntry] = useState<ReleaseOrderEntry | null>(null);
  const [rejectEntry, setRejectEntry] = useState<ReleaseOrderEntry | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: pending = [], isLoading: loadingPending } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "pending_pv_review" }],
  });

  // Fetch all approved release orders (ready_for_it, ready_for_material, and accepted)
  const { data: readyForIt = [] } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "ready_for_it" }],
  });
  const { data: readyForMaterial = [] } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "ready_for_material" }],
  });
  const { data: accepted = [] } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });
  
  // Combine all approved release orders
  const allApproved = useMemo(() => {
    return [...readyForIt, ...readyForMaterial, ...accepted];
  }, [readyForIt, readyForMaterial, accepted]);

  const approveMutation = useMutation({
    mutationFn: async ({ releaseOrderId, hasMagazine }: { releaseOrderId: number; hasMagazine: boolean }) => {
      const res = await fetch(`/api/release-orders/${releaseOrderId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user?.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "pending_pv_review" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "accepted" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "ready_for_it" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "ready_for_material" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders"] });
      const teamName = variables.hasMagazine ? "Material" : "IT";
      toast({ title: "Release Order accepted", description: `Accounts and ${teamName} have been notified.` });
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
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "pending_pv_review" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "pending_vp_review" }] });
      toast({ title: "Release Order rejected", description: "Sent to VP for review. VP will review and forward to manager if needed." });
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

  const renderPrimaryDetails = (entry: ReleaseOrderEntry) => {
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
              onClick={() => window.open(`/uploads/${workOrder.poUrl}`, "_blank", "noopener")}
            >
              View PO
            </Button>
          ) : (
            <div>Not uploaded</div>
          )}
        </div>
      {releaseOrder.rejectionReason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
          <div className="font-semibold">Latest rejection note</div>
          <div className="mt-1 whitespace-pre-wrap">{releaseOrder.rejectionReason}</div>
          {releaseOrder.rejectedAt && (
            <div className="text-xs mt-2 text-destructive/80">
              Updated {new Date(releaseOrder.rejectedAt).toLocaleString()}
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
            <CardTitle className="text-lg">Release Order {entry.releaseOrder.customRoNumber || `#${entry.releaseOrder.id}`}</CardTitle>
            <CardDescription>
              <div className="text-sm font-medium text-foreground">
                Work Order: {entry.releaseOrder.workOrder?.customWorkOrderId || `WO #${entry.releaseOrder.workOrderId}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(entry.workOrder?.totalAmount)}
              </div>
            </CardDescription>
            <div className="text-xs text-muted-foreground mt-1">
              Client: {entry.client?.name || entry.workOrder?.contactName || `Client #${entry.workOrder?.clientId}`}
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">{humanize(entry.releaseOrder.status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderPrimaryDetails(entry)}

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
                  const hasMagazine = entry.items.some((item: any) => 
                  !item.addonType && item.slot?.mediaType === "magazine"
                );
                approveMutation.mutate({ releaseOrderId: entry.releaseOrder.id, hasMagazine });
                }}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? "Accepting…" : "Approve & Finalize"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    ));
  };

  const pendingCount = pending.length;
  const acceptedCount = allApproved.length;
  const ongoingCount = allApproved.filter((entry) => entry.releaseOrder.paymentStatus !== "completed").length;
  const totalRevenue = allApproved.reduce((sum, entry) => sum + Number(entry.workOrder?.totalAmount ?? 0), 0);
  const pendingDues = allApproved
    .filter((entry) => entry.releaseOrder.paymentStatus !== "completed")
    .reduce((sum, entry) => sum + Number(entry.workOrder?.totalAmount ?? 0), 0);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-pv-sir-dashboard-title">PV Sir Dashboard</h1>
        <p className="text-muted-foreground">Final executive approval for high-value campaigns</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Final Approval</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved Ads</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing Campaigns</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ongoingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Snapshot</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
            <div className="text-xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              Pending Dues: <span className="font-semibold text-orange-600">{formatCurrency(pendingDues)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="accepted" data-testid="tab-accepted">
            Accepted ({acceptedCount})
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
          {renderReleaseOrders(allApproved, false)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Order {selectedEntry ? `#${selectedEntry.releaseOrder.id}` : ""}</DialogTitle>
          </DialogHeader>
          {selectedEntry ? (
            <div className="space-y-4">
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
                            variant="ghost"
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRejectEntry(selectedEntry);
                    setRejectReason("");
                  }}
                  disabled={rejectMutation.isPending}
                >
                  Reject
                </Button>
                <Button onClick={() => {
                  const hasMagazine = selectedEntry.items.some((item: any) => 
                    !item.addonType && item.slot?.mediaType === "magazine"
                  );
                  approveMutation.mutate({ releaseOrderId: selectedEntry.releaseOrder.id, hasMagazine });
                }} disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? "Accepting…" : "Approve & Finalize"}
                </Button>
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
              Add a note so managers know what to adjust before resubmitting.
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
