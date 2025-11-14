import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

function PrimaryDetails({ entry }: { entry: ReleaseOrderEntry }) {
  const { releaseOrder, workOrder, client, createdBy } = entry;
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
          <div className="font-medium">{formatCurrency(workOrder?.totalAmount)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Payment Type</div>
          <div className="font-medium capitalize">{workOrder?.paymentMode ? humanize(workOrder.paymentMode) : "—"}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-muted-foreground">Payment Status</div>
          <div className={releaseOrder.paymentStatus === "completed" ? "font-medium text-emerald-600" : "font-medium text-orange-600"}>
            {humanize(releaseOrder.paymentStatus) || "Unknown"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Created / Issued</div>
          <div className="font-medium">{releaseOrder.issuedAt ? new Date(releaseOrder.issuedAt).toLocaleString() : "—"}</div>
          {createdBy?.name ? <div className="text-xs text-muted-foreground">By {createdBy.name}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function PVFinalApprovalsPage() {
  const [selected, setSelected] = useState<ReleaseOrderEntry | null>(null);
  const { data: accepted = [], isLoading } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Final Approvals</h1>
        <p className="text-muted-foreground">Release orders you have approved.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : accepted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No accepted release orders yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accepted.map((entry) => (
            <Card
              key={entry.releaseOrder.id}
              className="cursor-pointer hover:shadow-md transition"
              onClick={() => setSelected(entry)}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Release Order #{entry.releaseOrder.id}</CardTitle>
                  <CardDescription>WO #{entry.releaseOrder.workOrderId} • {formatCurrency(entry.workOrder?.totalAmount)}</CardDescription>
                </div>
                <Badge variant="secondary" className="capitalize">{humanize(entry.releaseOrder.status)}</Badge>
              </CardHeader>
              <CardContent>
                <PrimaryDetails entry={entry} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Release Order #{selected?.releaseOrder.id}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <PrimaryDetails entry={selected} />
              <div className="space-y-2">
                <div className="text-muted-foreground">Campaign Items</div>
                <div className="space-y-2 max-h-60 overflow-auto border rounded p-3 bg-muted/40">
                  {selected.items.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No items linked to this release order.</div>
                  ) : (
                    selected.items.map((item) => (
                      <div key={item.id} className="border rounded-md p-2 text-xs">
                        <div className="font-medium">
                          {item.slot
                            ? `${item.slot.mediaType} • ${item.slot.pageType} • ${item.slot.position}`
                            : `Work Order Item #${item.workOrderItemId}`}
                        </div>
                        <div className="text-muted-foreground">
                          {item.startDate} → {item.endDate}
                        </div>
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
