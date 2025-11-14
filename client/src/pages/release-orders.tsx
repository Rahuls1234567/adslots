import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ReleaseOrdersPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data = [], isLoading } = useQuery<Array<{ releaseOrder: any; items: any[] }>>({
    queryKey: ["/api/release-orders"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Release Orders</h1>
        <p className="text-muted-foreground">Complete list of advertising campaigns</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Release Orders</CardTitle>
          <CardDescription>Complete list of advertising campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No release orders yet</p>
          ) : (
            <div className="space-y-2">
              {data.map(({ releaseOrder, items }) => (
                <Card key={releaseOrder.id} className="hover:shadow-sm transition cursor-pointer" onClick={() => navigate(`/release-orders/${releaseOrder.id}`)}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>RO #{releaseOrder.id} • WO #{releaseOrder.workOrderId}</CardTitle>
                      <CardDescription>
                        {new Date(releaseOrder.issuedAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={releaseOrder.status === 'deployed' ? 'default' : 'secondary'}>
                        {String(releaseOrder.status).replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant={releaseOrder.paymentStatus === 'completed' ? 'default' : 'outline'}>
                        {releaseOrder.paymentStatus === 'completed' ? 'Paid' : 'Not Paid'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Click to view details</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


