import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, CheckCircle, XCircle, Clock, Activity, Upload, Download, Eye } from "lucide-react";
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

const humanize = (value?: string | null) => (value ? value.replace(/_/g, " ") : "");

export default function ITDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedEntry, setSelectedEntry] = useState<ReleaseOrderEntry | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Fetch accepted release orders
  const { data: acceptedOrders = [], isLoading } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });

  // Fetch deployments from database
  const { data: deployments = [], isLoading: loadingDeployments } = useQuery<any[]>({
    queryKey: ["/api/deployments"],
  });

  // Get items that need deployment (have banners)
  const itemsToDeploy = acceptedOrders.flatMap((entry) =>
    entry.items
      .filter((it: any) => !it.addonType && it.bannerUrl)
      .map((it: any) => {
        // Find deployment for this work order item
        const deployment = deployments.find((d: any) => d.workOrderItemId === it.id);
        return {
          ...it,
          releaseOrder: entry.releaseOrder,
          workOrder: entry.workOrder,
          client: entry.client,
          slot: it.slot,
          deployment,
        };
      })
  );

  // Calculate counts from database
  const deployedItemsCount = deployments.filter((d: any) => d.status === "deployed").length;
  const pendingDeploymentCount = itemsToDeploy.filter((item: any) => !item.deployment || item.deployment.status !== "deployed").length;
  const activeDeploymentsCount = deployments.filter((d: any) => {
    if (d.status !== "deployed") return false;
    // Check if deployment is still active (campaign not expired)
    const item = itemsToDeploy.find((it: any) => it.id === d.workOrderItemId);
    if (!item) return false;
    const endDate = new Date(item.endDate);
    const now = new Date();
    return endDate >= now;
  }).length;

  const deployBannerMutation = useMutation({
    mutationFn: async ({ releaseOrderId, itemId, bannerUrl }: { releaseOrderId: number; itemId: number; bannerUrl: string }) => {
      const res = await fetch("/api/deployments/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseOrderId,
          workOrderItemId: itemId,
          bannerUrl,
          deployedById: user?.id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "accepted" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      toast({
        title: "Success",
        description: "Banner deployed successfully",
      });
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deploy banner",
        variant: "destructive",
      });
    },
  });

  const getSlotInfo = (item: any) => {
    if (item.slot) {
      return {
        mediaType: item.slot.mediaType,
        pageType: item.slot.pageType,
        position: item.slot.position,
        dimensions: item.slot.dimensions,
      };
    }
    return {
      mediaType: "Unknown",
      pageType: "Unknown",
      position: "Unknown",
      dimensions: "Unknown",
    };
  };

  const PAGE_LABELS: Record<string, string> = {
    main: "Landing page",
    student_home: "Student home page",
    student_login: "Login page",
    aimcat_results_analysis: "AIMCAT results and analysis page",
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">IT Team Dashboard</h1>
        <p className="text-muted-foreground">Manage banner deployments and technical operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deployments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeploymentCount}</div>
            <p className="text-xs text-muted-foreground">Banners awaiting deployment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDeploymentsCount}</div>
            <p className="text-xs text-muted-foreground">Currently live</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployed Banners</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deployedItemsCount}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Operational</div>
            <p className="text-xs text-muted-foreground">All systems running</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending Banner Deployments</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : itemsToDeploy.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No banners pending deployment</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {itemsToDeploy.map((item, idx) => {
                const slotInfo = getSlotInfo(item);
                const section = slotInfo.mediaType === 'website'
                  ? `Website • ${PAGE_LABELS[slotInfo.pageType] ?? humanize(slotInfo.pageType)}`
                  : humanize(slotInfo.mediaType);
                return (
                  <Card key={`${item.releaseOrder.id}-${item.id}-${idx}`}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Release Order #{item.releaseOrder.id}</CardTitle>
                        <CardDescription>
                          {item.releaseOrder.workOrder?.customWorkOrderId || `WO #${item.releaseOrder.workOrderId}`} • {item.client?.name || item.workOrder?.contactName || `Client #${item.workOrder?.clientId}`}
                        </CardDescription>
                      </div>
                      <Badge variant="default">Accepted</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Slot Details</p>
                            <p className="font-medium">{section}</p>
                            <p className="text-xs text-muted-foreground">
                              Position: {slotInfo.position} • {slotInfo.dimensions}
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
                              <Upload className="h-4 w-4" />
                              Deploy Banner
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

        <div>
          <h2 className="text-lg font-semibold mb-4">Accepted Release Orders</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : acceptedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No accepted release orders yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {acceptedOrders.map((entry) => (
                <Card
                  key={entry.releaseOrder.id}
                  className="cursor-pointer hover:shadow-md transition"
                  onClick={() => navigate(`/release-orders/${entry.releaseOrder.customRoNumber || entry.releaseOrder.id}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Release Order #{entry.releaseOrder.id}</CardTitle>
                      <CardDescription>
                        {entry.releaseOrder.workOrder?.customWorkOrderId || `WO #${entry.releaseOrder.workOrderId}`} • {formatCurrency(entry.workOrder?.totalAmount)} • {entry.items.filter((it: any) => !it.addonType).length} item(s)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Accepted</Badge>
                      <Badge variant={entry.releaseOrder.paymentStatus === 'completed' ? 'default' : 'outline'}>
                        {entry.releaseOrder.paymentStatus === 'completed' ? 'Paid' : 'Not Paid'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Client: {entry.client?.name || entry.workOrder?.contactName || `Client #${entry.workOrder?.clientId}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Issued: {entry.releaseOrder.issuedAt ? new Date(entry.releaseOrder.issuedAt).toLocaleString() : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Banners ready: {entry.items.filter((it: any) => !it.addonType && it.bannerUrl).length} / {entry.items.filter((it: any) => !it.addonType).length}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deploy Banner Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deploy Banner</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Release Order</p>
                    <p className="font-medium">RO #{selectedItem.releaseOrder.id}</p>
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
                  <p className="text-muted-foreground mb-2">Slot Details</p>
                  <div className="space-y-1">
                    {selectedItem.slot ? (
                      <>
                        <p className="font-medium">
                          {selectedItem.slot.mediaType === 'website'
                            ? `Website • ${PAGE_LABELS[selectedItem.slot.pageType] ?? humanize(selectedItem.slot.pageType)}`
                            : humanize(selectedItem.slot.mediaType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Position: {selectedItem.slot.position} • Dimensions: {selectedItem.slot.dimensions}
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
                      if (selectedItem.bannerUrl) {
                        deployBannerMutation.mutate({
                          releaseOrderId: selectedItem.releaseOrder.id,
                          itemId: selectedItem.id,
                          bannerUrl: selectedItem.bannerUrl,
                        });
                      }
                    }}
                    disabled={deployBannerMutation.isPending || !selectedItem.bannerUrl}
                    className="gap-2"
                  >
                    {deployBannerMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Confirm Deploy
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
