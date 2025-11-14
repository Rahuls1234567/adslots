import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

type WorkOrder = {
  id: number;
  clientId: number;
  businessSchoolName?: string | null;
  contactName?: string | null;
  status: string;
  paymentMode?: string | null;
  totalAmount: string;
  createdAt: string;
  createdByName?: string | null;
  createdOnDate?: string | null;
  createdOnTime?: string | null;
  negotiationRequested?: boolean | null;
  negotiationReason?: string | null;
  negotiationRequestedAt?: string | null;
  clientName?: string | null;
};

type WorkOrderItem = {
  id: number;
  workOrderId: number;
  slotId: number;
  startDate: string;
  endDate: string;
  unitPrice: string;
  subtotal: string;
};

export default function WorkOrdersPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [infoWo, setInfoWo] = useState<WorkOrder | null>(null);
  const [rejectWo, setRejectWo] = useState<WorkOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [negotiationWo, setNegotiationWo] = useState<WorkOrder | null>(null);
  const [filter, setFilter] = useState<"all" | "quoted" | "pending" | "negotiation">("all");
  const { data, isLoading } = useQuery<{ workOrder: WorkOrder; items: WorkOrderItem[] }[]>({
    queryKey: ["/api/work-orders"],
  });

  // Sort work orders by creation date (latest first)
  const sortedData = useMemo(
    () => (data || []).slice().sort((a, b) => (new Date(b.workOrder.createdAt).getTime() - new Date(a.workOrder.createdAt).getTime())),
    [data]
  );

  const { data: clientInfo } = useQuery<any>({
    queryKey: infoWo?.clientId ? [`/api/users/${infoWo.clientId}`] : ["/api/users/disabled"],
    enabled: !!infoWo?.clientId,
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ workOrderId, itemId, unitPrice }: { workOrderId: number; itemId: number; unitPrice: number }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitPrice }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "Saved", description: "Item price updated successfully." });
    },
    onError: async (error: any) => {
      toast({ title: "Save failed", description: error?.message || "Could not update price", variant: "destructive" });
    },
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async (workOrderId: number) => {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "quoted" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "Quote sent", description: "The client has been sent a quotation." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send quote", description: error?.message || "Try again", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reason, actorId: user?.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setRejectWo(null);
      setRejectReason("");
      toast({ title: "Rejected", description: "Work order has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Could not reject work order", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <p className="text-muted-foreground">Requests raised by clients with combined totals</p>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        <Button size="sm" variant={filter === "quoted" ? "default" : "outline"} onClick={() => setFilter("quoted")}>Quoted</Button>
        <Button size="sm" variant={filter === "negotiation" ? "default" : "outline"} onClick={() => setFilter("negotiation")}>Negotiation</Button>
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !sortedData || sortedData.length === 0 ? (
        <p className="text-muted-foreground">No work orders yet</p>
      ) : (
        <div className="space-y-4">
          {sortedData
            .filter(({ workOrder }) => {
              if (filter === "all") return true;
              if (filter === "quoted") return workOrder.status === "quoted";
              if (filter === "negotiation") return workOrder.negotiationRequested === true;
              if (filter === "pending") return workOrder.status === "draft";
              return true;
            })
            .filter(({ workOrder }) => workOrder.status !== "rejected")
            .map(({ workOrder, items }) => {
              // Debug: Log to see what data we're getting
              // console.log('Work Order:', workOrder.id, 'Client Name:', workOrder.clientName);
              return (
              <Card key={workOrder.id} className="hover:shadow-sm transition cursor-pointer" onClick={() => navigate(`/work-orders/${workOrder.id}`)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{`${workOrder.clientName || workOrder.businessSchoolName || "Client"}_Work Order #${workOrder.id}`}</CardTitle>
                    <CardDescription>
                      {workOrder.businessSchoolName || "—"} • Items: {items.length}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setInfoWo(workOrder); }}>Info</Button>
                      <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setRejectWo(workOrder); }}>Reject</Button>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="secondary">{workOrder.status.replace(/_/g, " ")}</Badge>
                      {workOrder.negotiationRequested && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNegotiationWo(workOrder);
                          }}
                          className="h-7 text-xs"
                        >
                          Negotiation
                        </Button>
                      )}
                    </div>
                    <div className="mt-1">
                      {Number(workOrder.totalAmount) > 0 || workOrder.status === 'quoted' ? (
                        <span className="font-semibold">₹{Number(workOrder.totalAmount).toLocaleString()}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Yet to be quoted</span>
                      )}
                    </div>
                    {workOrder.createdByName && (
                      <div className="text-xs text-muted-foreground mt-1">By: {workOrder.createdByName}</div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="text-sm">{workOrder.createdOnDate && workOrder.createdOnTime ? `${workOrder.createdOnDate} ${workOrder.createdOnTime}` : new Date(workOrder.createdAt).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!infoWo} onOpenChange={(open) => !open && setInfoWo(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {infoWo && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md border bg-muted/30">
                <div>
                  <div className="text-muted-foreground">Business School</div>
                  <div className="font-medium">{infoWo.businessSchoolName || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Contact Name</div>
                  <div className="font-medium">{infoWo.contactName || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Client ID</div>
                  <div className="font-medium">{infoWo.clientId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium capitalize">{infoWo.status.replace(/_/g, " ")}</div>
                </div>
              </div>
              {clientInfo && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md border">
                  <div>
                    <div className="text-muted-foreground">Client Name</div>
                    <div className="font-medium">{clientInfo.name}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Phone</div>
                    <div className="font-medium">{clientInfo.phone}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Email</div>
                    <div className="font-medium break-all">{clientInfo.email}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Role</div>
                    <div className="font-medium uppercase">{String(clientInfo.role).replace("_"," ")}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">GST Number</div>
                    <div className="font-medium">{clientInfo.gstNumber || "—"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">School Address</div>
                    <div className="font-medium">{clientInfo.schoolAddress || "—"}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectWo} onOpenChange={(open) => !open && setRejectWo(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Reject Work Order #{rejectWo?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Add an optional reason for the client.</div>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectWo(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectWo!.id, reason: rejectReason })} disabled={rejectMutation.isPending}>
                {rejectMutation.isPending ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!negotiationWo} onOpenChange={(open) => !open && setNegotiationWo(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Client negotiation request</DialogTitle>
          </DialogHeader>
          {negotiationWo && (
            <div className="space-y-2 text-sm">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <div className="font-semibold text-amber-900">Reason</div>
                <div className="mt-1 whitespace-pre-wrap">{negotiationWo.negotiationReason || "No notes provided"}</div>
                {negotiationWo.negotiationRequestedAt && (
                  <div className="mt-2 text-[11px] uppercase tracking-wide text-amber-600">
                    Received {new Date(negotiationWo.negotiationRequestedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Update the quote after addressing the client's concerns. Sending a new quote will reset the negotiation flag.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


