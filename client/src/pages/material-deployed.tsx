import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle, Calendar, Eye, Download } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const formatCurrency = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  return `₹${num.toLocaleString()}`;
};

interface ReleaseOrderEntry {
  releaseOrder: any;
  items: any[];
  workOrder?: any;
  client?: any;
  createdBy?: any;
}

export default function MaterialDeployed() {
  const [, navigate] = useLocation();

  // Fetch all deployed release orders that had magazine items
  const { data: allReleaseOrders = [], isLoading } = useQuery<ReleaseOrderEntry[]>({
    queryKey: ["/api/release-orders"],
  });

  // Filter for deployed release orders that have magazine items
  const deployedOrders = allReleaseOrders.filter((entry) => {
    const hasMagazineItems = entry.items.some((it: any) => 
      !it.addonType && it.slot?.mediaType === "magazine"
    );
    return entry.releaseOrder.status === "deployed" && hasMagazineItems;
  });

  // Note: Material processing is tracked via release order status "deployed"
  // We show all deployed orders that have magazine items

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Deployed Material Processing</h1>
        <p className="text-muted-foreground">Magazine slots that have been processed and deployed</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deployedOrders.length}</div>
            <p className="text-xs text-muted-foreground">Release orders deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deployedOrders.reduce((sum, entry) => 
                sum + entry.items.filter((it: any) => !it.addonType && it.slot?.mediaType === "magazine").length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Magazine slots processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Deployed</div>
            <p className="text-xs text-muted-foreground">All items live</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Deployed Release Orders</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : deployedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deployed release orders with magazine slots yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {deployedOrders.map((entry) => {
                const magazineItems = entry.items.filter((it: any) => 
                  !it.addonType && it.slot?.mediaType === "magazine"
                );
                // For deployed orders, we assume all magazine items are processed
                const processedCount = magazineItems.length;

                return (
                  <Card
                    key={entry.releaseOrder.id}
                    className="cursor-pointer hover:shadow-md transition"
                    onClick={() => navigate(`/release-orders/${entry.releaseOrder.customRoNumber || entry.releaseOrder.id}`)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Release Order {entry.releaseOrder.customRoNumber || `#${entry.releaseOrder.id}`}</CardTitle>
                        <CardDescription className="mt-1">
                          <div className="text-sm font-medium text-foreground">
                            Work Order: {entry.releaseOrder.workOrder?.customWorkOrderId || `WO #${entry.releaseOrder.workOrderId}`}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(entry.workOrder?.totalAmount)} • {magazineItems.length} magazine slot(s)
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500">Deployed</Badge>
                        <Badge variant={entry.releaseOrder.paymentStatus === 'completed' ? 'default' : 'outline'}>
                          {entry.releaseOrder.paymentStatus === 'completed' ? 'Paid' : 'Not Paid'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          Client: {entry.client?.name || entry.workOrder?.contactName || `Client #${entry.workOrder?.clientId}`}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Deployed: {entry.releaseOrder.issuedAt ? new Date(entry.releaseOrder.issuedAt).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Processed: {processedCount} / {magazineItems.length} magazine slot(s)
                        </div>
                        {magazineItems.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Magazine Slots:</p>
                            <div className="grid gap-2">
                              {magazineItems.map((item: any, idx: number) => (
                                <div key={item.id || idx} className="flex items-center justify-between p-2 bg-muted/40 rounded-md">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {item.slot?.position || "Slot"} • Page {item.slot?.magazinePageNumber || "N/A"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {item.startDate} → {item.endDate}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.bannerUrl && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(item.bannerUrl, "_blank", "noopener");
                                          }}
                                          className="h-7 w-7 p-0"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const link = document.createElement('a');
                                            link.href = item.bannerUrl;
                                            link.download = `banner-${entry.releaseOrder.id}-${item.id}.${item.bannerUrl.split('.').pop()}`;
                                            link.click();
                                          }}
                                          className="h-7 w-7 p-0"
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                    <Badge variant="default" className="text-xs bg-green-500">
                                      Processed
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
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
    </div>
  );
}

