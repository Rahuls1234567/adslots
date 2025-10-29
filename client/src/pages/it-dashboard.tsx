import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Server, CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Slot } from "@shared/schema";

export default function ITDashboard() {
  const { toast } = useToast();

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: slots = [] } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });

  const pendingDeploymentBookings = bookings.filter(b => b.status === "pending_deployment");
  const activeBookings = bookings.filter(b => b.status === "active");
  const allDeployedBookings = bookings.filter(b => ["active", "expired", "paused"].includes(b.status));

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      return await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Deployment status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update deployment status",
        variant: "destructive",
      });
    },
  });

  const getSlotDetails = (slotId: number) => {
    return slots.find(s => s.id === slotId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold">IT Team Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage banner deployments and technical operations</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deployments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-deployments">{pendingDeploymentBookings.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting deployment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Banners</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-banners">{activeBookings.length}</div>
              <p className="text-xs text-muted-foreground">Currently live</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deployed</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-deployed">{allDeployedBookings.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500" data-testid="text-system-status">Operational</div>
              <p className="text-xs text-muted-foreground">All systems running</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Pending Deployments</h2>
            {pendingDeploymentBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending deployments</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingDeploymentBookings.map((booking) => {
                  const slot = getSlotDetails(booking.slotId);
                  return (
                    <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">Booking #{booking.id}</h3>
                              <Badge variant="secondary">{slot?.mediaType || "Unknown"}</Badge>
                              <Badge variant="outline">{booking.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Slot Details</p>
                                <p className="font-medium">{slot?.pageType} - {slot?.position}</p>
                                <p className="text-xs text-muted-foreground">{slot?.dimensions}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Duration</p>
                                <p className="font-medium">{new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Media Type</p>
                                <p className="font-medium">{slot?.mediaType}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Client ID</p>
                                <p className="font-medium">{booking.clientId}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "rejected" })}
                              disabled={updateBookingStatusMutation.isPending}
                              data-testid={`button-reject-${booking.id}`}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject Deployment
                            </Button>
                            <Button
                              onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "active" })}
                              disabled={updateBookingStatusMutation.isPending}
                              data-testid={`button-deploy-${booking.id}`}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Deploy Banner
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Active Banners</h2>
            <div className="grid gap-4">
              {activeBookings.slice(0, 10).map((booking) => {
                const slot = getSlotDetails(booking.slotId);
                return (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Booking #{booking.id}</span>
                            <Badge variant="secondary">{slot?.mediaType}</Badge>
                            <Badge className="bg-green-500">{booking.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {slot?.pageType} - {slot?.position} | {slot?.dimensions}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Live</p>
                          <p className="text-xs text-muted-foreground">Ends: {new Date(booking.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
