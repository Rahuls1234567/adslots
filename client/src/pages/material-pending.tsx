import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle, Clock, Eye, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useState } from "react";
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

export default function MaterialPending() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedEntry, setSelectedEntry] = useState<ReleaseOrderEntry | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Fetch release orders ready for material team (magazine slots)
  const { data: materialOrders = [], isLoading } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "ready_for_material" }],
  });

  // Get items that are magazine slots and need material processing
  const itemsToProcess = materialOrders.flatMap((entry) =>
    entry.items
      .filter((it: any) => !it.addonType && it.bannerUrl && it.slot?.mediaType === "magazine")
      .map((it: any) => {
        return {
          ...it,
          releaseOrder: entry.releaseOrder,
          workOrder: entry.workOrder,
          client: entry.client,
          slot: it.slot,
        };
      })
  );

  const processMagazineMutation = useMutation({
    mutationFn: async ({ releaseOrderId, itemId }: { releaseOrderId: number | string; itemId: number }) => {
      const res = await fetch(`/api/release-orders/${releaseOrderId}/material-processed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderItemId: itemId,
          processedById: user?.id,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "ready_for_material" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Success",
        description: "Magazine slot processed successfully",
      });
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process magazine slot",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Material Processing</h1>
        <p className="text-muted-foreground">Magazine slots awaiting material team processing</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemsToProcess.length}</div>
            <p className="text-xs text-muted-foreground">Magazine slots to process</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Release Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materialOrders.length}</div>
            <p className="text-xs text-muted-foreground">Orders assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Active</div>
            <p className="text-xs text-muted-foreground">Processing ready</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending Magazine Slot Processing</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : itemsToProcess.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No magazine slots pending processing</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {itemsToProcess.map((item, idx) => {
                const slotInfo = item.slot || {};
                return (
                  <Card key={`${item.releaseOrder.id}-${item.id}-${idx}`}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Release Order {item.releaseOrder.customRoNumber || `#${item.releaseOrder.id}`}</CardTitle>
                        <CardDescription className="mt-1">
                          <div className="text-sm font-medium text-foreground">
                            Work Order: {item.releaseOrder.workOrder?.customWorkOrderId || `WO #${item.releaseOrder.workOrderId}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.client?.name || item.workOrder?.contactName || `Client #${item.workOrder?.clientId}`}
                          </div>
                        </CardDescription>
                      </div>
                      <Badge variant="default">Ready for Material</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Slot Details</p>
                            <p className="font-medium">Magazine • {slotInfo.position || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">
                              Page: {slotInfo.magazinePageNumber || "N/A"} • Dimensions: {slotInfo.dimensions || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Campaign Period</p>
                            <p className="font-medium">{item.startDate} → {item.endDate}</p>
                          </div>
                        </div>
                        
                        {item.bannerUrl && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(item.bannerUrl, "_blank", "noopener")}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Banner
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = item.bannerUrl;
                                link.download = `banner-${item.releaseOrder.id}-${item.id}.${item.bannerUrl.split('.').pop()}`;
                                link.click();
                              }}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download Banner
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedEntry({
                                  releaseOrder: item.releaseOrder,
                                  items: [item],
                                  workOrder: item.workOrder,
                                  client: item.client,
                                });
                                setSelectedItem(item);
                              }}
                              className="gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Mark as Processed
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Process Magazine Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Magazine Slot</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Release Order</p>
                    <p className="font-medium">{selectedItem.releaseOrder.customRoNumber || `RO #${selectedItem.releaseOrder.id}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Work Order</p>
                    <p className="font-medium">{selectedItem.releaseOrder.workOrder?.customWorkOrderId || `WO #${selectedItem.releaseOrder.workOrderId}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">
                      {selectedItem.client?.name || selectedItem.workOrder?.contactName || `Client #${selectedItem.workOrder?.clientId}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Campaign Period</p>
                    <p className="font-medium">{selectedItem.startDate} → {selectedItem.endDate}</p>
                  </div>
                </div>
                
                <div className="border rounded-md p-3 bg-muted/40">
                  <p className="text-muted-foreground mb-2">Magazine Slot Details</p>
                  <div className="space-y-1">
                    {selectedItem.slot ? (
                      <>
                        <p className="font-medium">Magazine • {selectedItem.slot.position}</p>
                        <p className="text-xs text-muted-foreground">
                          Page Number: {selectedItem.slot.magazinePageNumber || "N/A"} • Dimensions: {selectedItem.slot.dimensions}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Slot details not available</p>
                    )}
                  </div>
                </div>

                {selectedItem.bannerUrl && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">Banner Preview</p>
                    <div className="border rounded-md p-2 bg-muted/40">
                      <img
                        src={selectedItem.bannerUrl}
                        alt="Banner preview"
                        className="max-w-full h-auto rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedItem.bannerUrl, "_blank", "noopener")}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Full Size
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedItem.bannerUrl;
                          link.download = `banner-${selectedItem.releaseOrder.id}-${selectedItem.id}.${selectedItem.bannerUrl.split('.').pop()}`;
                          link.click();
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedItem(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      processMagazineMutation.mutate({
                        releaseOrderId: selectedItem.releaseOrder.customRoNumber || selectedItem.releaseOrder.id,
                        itemId: selectedItem.id,
                      });
                    }}
                    disabled={processMagazineMutation.isPending || !user?.id}
                    className="gap-2"
                  >
                    {processMagazineMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Mark as Processed
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

