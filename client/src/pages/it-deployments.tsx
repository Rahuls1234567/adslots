import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Server, CheckCircle, XCircle, Clock, Upload, Download, Eye, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

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

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

export default function ITDeploymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);

  if (!user || user.role !== "it") {
    return <Redirect to="/" />;
  }

  // Fetch accepted release orders
  const { data: acceptedOrders = [], isLoading } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });

  // Fetch deployments from database
  const { data: deployments = [], isLoading: loadingDeployments } = useQuery<any[]>({
    queryKey: ["/api/deployments"],
  });

  // Get items that need deployment (have banners)
  const itemsToDeploy = useMemo(() => {
    return acceptedOrders.flatMap((entry) =>
      entry.items
        .filter((it: any) => !it.addonType && it.bannerUrl)
        .map((it: any) => {
          // Find deployment for this work order item
          const deployment = deployments.find((d: any) => d.workOrderItemId === it.id);
          
          // Determine deployment status
          let deploymentStatus: "pending" | "deployed" | "expired" = "pending";
          if (deployment) {
            if (deployment.status === "expired") {
              deploymentStatus = "expired";
            } else if (deployment.status === "deployed") {
              // Check if campaign has expired
              const endDate = new Date(it.endDate);
              const now = new Date();
              if (endDate < now) {
                deploymentStatus = "expired";
              } else {
                deploymentStatus = "deployed";
              }
            } else {
              deploymentStatus = "pending";
            }
          } else {
            // No deployment record, check if campaign has expired
            const endDate = new Date(it.endDate);
            const now = new Date();
            if (endDate < now) {
              deploymentStatus = "expired";
            } else {
              deploymentStatus = "pending";
            }
          }

          return {
            ...it,
            releaseOrder: entry.releaseOrder,
            workOrder: entry.workOrder,
            client: entry.client,
            slot: it.slot,
            deploymentStatus,
            deployment, // Include deployment data
          };
        })
    );
  }, [acceptedOrders, deployments]);

  // Separate by status
  const pendingItems = itemsToDeploy.filter((item) => item.deploymentStatus === "pending");
  const deployedItems = itemsToDeploy.filter((item) => item.deploymentStatus === "deployed");
  const expiredItems = itemsToDeploy.filter((item) => item.deploymentStatus === "expired");

  // Check for items expiring in 2 days
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const expiringSoon = itemsToDeploy.filter((item) => {
    const endDate = new Date(item.endDate);
    return endDate <= twoDaysFromNow && endDate > now;
  });

  const deployBannerMutation = useMutation({
    mutationFn: async ({ releaseOrderId, itemId, bannerUrl }: { releaseOrderId: number; itemId: number; bannerUrl: string }) => {
      // TODO: Implement actual deployment API
      // POST /api/deployments/deploy
      return await apiRequest("POST", "/api/deployments/deploy", {
        releaseOrderId,
        workOrderItemId: itemId,
        bannerUrl,
        deployedById: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "accepted" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      toast({
        title: "Success",
        description: "Banner deployed successfully to slot",
      });
      setDeployDialogOpen(false);
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

  const renderDeploymentItem = (item: any, showActions = true) => {
    const slotInfo = getSlotInfo(item);
    const section = slotInfo.mediaType === 'website'
      ? `Website • ${PAGE_LABELS[slotInfo.pageType] ?? humanize(slotInfo.pageType)}`
      : humanize(slotInfo.mediaType);
    
    const isExpiringSoon = expiringSoon.some(exp => exp.id === item.id);
    const deployment = item.deployment;

    return (
      <Card key={`${item.releaseOrder.id}-${item.id}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">RO #{item.releaseOrder.id} • WO #{item.releaseOrder.workOrderId}</CardTitle>
            <CardDescription>
              {item.client?.name || item.workOrder?.contactName || `Client #${item.workOrder?.clientId}`}
            </CardDescription>
          </div>
          <Badge variant={item.deploymentStatus === "deployed" ? "default" : item.deploymentStatus === "expired" ? "destructive" : "secondary"}>
            {item.deploymentStatus === "deployed" ? "Deployed" : item.deploymentStatus === "expired" ? "Expired" : "Pending"}
          </Badge>
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
                {isExpiringSoon && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Expiring soon (within 2 days)
                  </div>
                )}
              </div>
            </div>

            {/* Deployment Information */}
            {deployment && item.deploymentStatus === "deployed" && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <p className="font-semibold">Deployment Information</p>
                <div className="mt-1 space-y-1 text-xs">
                  <p>Deployed on: {new Date(deployment.deployedAt).toLocaleString()}</p>
                  {deployment.slotId && (
                    <p>Slot ID: {deployment.slotId}</p>
                  )}
                  <p>Status: {deployment.status}</p>
                </div>
              </div>
            )}

            {item.deploymentStatus === "expired" && deployment && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                <p className="font-semibold">Expired Deployment</p>
                <div className="mt-1 space-y-1 text-xs">
                  <p>Deployed on: {new Date(deployment.deployedAt).toLocaleString()}</p>
                  <p>Campaign ended: {new Date(item.endDate).toLocaleString()}</p>
                </div>
              </div>
            )}
            
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
                  Download
                </Button>
                {showActions && item.deploymentStatus === "pending" && (
                  <Button
                    onClick={() => {
                      setSelectedItem(item);
                      setDeployDialogOpen(true);
                    }}
                    className="gap-2"
                    disabled={deployBannerMutation.isPending}
                  >
                    <Upload className="h-4 w-4" />
                    Deploy to Slot
                  </Button>
                )}
                {showActions && item.deploymentStatus === "deployed" && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/release-orders/${item.releaseOrder.id}`)}
                    size="sm"
                  >
                    View Details
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Banner Deployments</h1>
        <p className="text-muted-foreground">Deploy approved banners to their respective slots</p>
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Expiring Soon Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800">
              {expiringSoon.length} banner{expiringSoon.length === 1 ? "" : "s"} expiring within 2 days. 
              Ensure backup banners are ready.
            </p>
            <div className="mt-4 space-y-2">
              {expiringSoon.map((item) => (
                <div key={`exp-${item.releaseOrder.id}-${item.id}`} className="text-sm text-orange-900">
                  RO #{item.releaseOrder.id} • {item.endDate} • {getSlotInfo(item).mediaType} • {getSlotInfo(item).position}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Deployment ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="deployed">
            Deployed ({deployedItems.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired ({expiredItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoading || loadingDeployments ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No banners pending deployment</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((item) => renderDeploymentItem(item, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deployed" className="space-y-4">
          {loadingDeployments ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : deployedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deployed banners</p>
                  <p className="text-xs mt-2">Deploy banners from the "Pending Deployment" tab to see them here.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {deployedItems.map((item) => renderDeploymentItem(item, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {loadingDeployments ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : expiredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No expired banners</p>
                  <p className="text-xs mt-2">Banners that have passed their campaign end date will appear here.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {expiredItems.map((item) => renderDeploymentItem(item, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Deploy Banner Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>Deploy Banner to Slot</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <>
              <div className="space-y-4 px-6 overflow-y-auto flex-1 min-h-0">
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Release Order</p>
                      <p className="font-medium">RO #{selectedItem.releaseOrder.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Work Order</p>
                      <p className="font-medium">WO #{selectedItem.releaseOrder.workOrderId}</p>
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

                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-semibold">Deployment Information</p>
                    <p className="text-xs mt-1">
                      This will push the banner to the slot and make it live. Deployment logs will be maintained automatically.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 px-6 pb-6 border-t flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeployDialogOpen(false);
                    setSelectedItem(null);
                  }}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

