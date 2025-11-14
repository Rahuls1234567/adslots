import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";

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
      {releaseOrder.rejectionReason && releaseOrder.status === "pending_pv_review" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
          <div className="font-semibold">Waiting for PV Sir Review</div>
          <div className="text-xs mt-1 text-amber-700">
            This order is pending PV Sir's final approval
          </div>
        </div>
      )}
      {releaseOrder.rejectionReason && releaseOrder.status === "pending_vp_review" && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
          <div className="font-semibold">Rejected by PV Sir</div>
          <div className="mt-1 whitespace-pre-wrap">{releaseOrder.rejectionReason}</div>
          {releaseOrder.rejectedAt && (
            <div className="text-xs mt-2 text-destructive/80">
              Rejected on {new Date(releaseOrder.rejectedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const renderReleaseOrders = (rows: ReleaseOrderEntry[], onViewDetails: (entry: ReleaseOrderEntry) => void) => {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">No release orders to display.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((entry) => (
        <Card
          key={entry.releaseOrder.id}
          className="cursor-pointer hover:shadow-md transition"
          onClick={() => onViewDetails(entry)}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Release Order #{entry.releaseOrder.id}</CardTitle>
              <CardDescription>WO #{entry.releaseOrder.workOrderId} • {formatCurrency(entry.workOrder?.totalAmount)}</CardDescription>
            </div>
            <Badge variant="secondary" className="capitalize">{humanize(entry.releaseOrder.status)}</Badge>
          </CardHeader>
          <CardContent>
            {renderPrimaryDetails(entry, () => onViewDetails(entry))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default function VPApprovalsPage() {
  const [selectedEntry, setSelectedEntry] = useState<ReleaseOrderEntry | null>(null);

  // Fetch all orders that VP has approved
  // 1. Orders awaiting PV Sir review (pending_pv_review)
  const { data: pendingPVReview = [], isLoading: loadingPendingPV } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "pending_pv_review" }],
  });

  // 2. Orders that have been fully accepted (accepted)
  const { data: accepted = [], isLoading: loadingAccepted } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });

  // Combine all approved orders
  const allApproved = useMemo(() => {
    return [...pendingPVReview, ...accepted];
  }, [pendingPVReview, accepted]);

  const isLoading = loadingPendingPV || loadingAccepted;
  const pendingCount = pendingPVReview.length;
  const acceptedCount = accepted.length;
  const totalCount = allApproved.length;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Approvals</h1>
        <p className="text-muted-foreground">All release orders you have approved.</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All ({totalCount})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending PV Review ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            renderReleaseOrders(allApproved, setSelectedEntry)
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {loadingPendingPV ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            renderReleaseOrders(pendingPVReview, setSelectedEntry)
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {loadingAccepted ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            renderReleaseOrders(accepted, setSelectedEntry)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Release Order Details</DialogTitle>
          </DialogHeader>
          {selectedEntry ? (
            <div className="space-y-4 text-sm">
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
    </div>
  );
}

