import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import type { Booking, Slot } from "@shared/schema";

export default function VPDashboard() {
  const { toast } = useToast();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: slots = [] } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });

  const pendingBookings = bookings.filter(b => b.status === "pending_vp");
  const approvedBookings = bookings.filter(b => ["pending_pv", "pending_payment", "pending_deployment", "active"].includes(b.status));
  const allApproved = bookings.filter(b => !["pending_manager", "pending_vp", "rejected"].includes(b.status));

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      return await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Updated",
        description: "The booking status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-vp-dashboard-title">VP Dashboard</h1>
        <p className="text-muted-foreground">Review and approve campaigns escalated by managers</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending VP Approval</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBookings.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved by VP</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedBookings.length}</div>
            <p className="text-xs text-muted-foreground">In next approval stage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allApproved.length}</div>
            <p className="text-xs text-muted-foreground">All approved campaigns</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Approvals ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            Approved ({approvedBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : pendingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No pending approvals</p>
              </CardContent>
            </Card>
          ) : (
            pendingBookings.map((booking) => {
              const slot = slots.find(s => s.id === booking.slotId);
              return (
                <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">Booking #{booking.id}</CardTitle>
                        <CardDescription>
                          {slot ? `${slot.mediaType} - ${slot.pageType} - ${slot.position}` : "Slot details unavailable"}
                        </CardDescription>
                      </div>
                      <Badge>Approved by Manager</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Start Date:</span>
                          <p className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End Date:</span>
                          <p className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payment Type:</span>
                          <p className="font-medium capitalize">{booking.paymentType.replace(/_/g, " ")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Amount:</span>
                          <p className="font-bold text-primary">₹{booking.totalAmount}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="destructive"
                          onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "rejected" })}
                          disabled={updateBookingStatusMutation.isPending}
                          data-testid={`button-reject-${booking.id}`}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "pending_pv" })}
                          disabled={updateBookingStatusMutation.isPending}
                          data-testid={`button-approve-${booking.id}`}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve & Send to PV Sir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedBookings.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No approved bookings</p>
              </CardContent>
            </Card>
          ) : (
            approvedBookings.map((booking) => {
              const slot = slots.find(s => s.id === booking.slotId);
              return (
                <Card key={booking.id} data-testid={`card-booking-approved-${booking.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">Booking #{booking.id}</CardTitle>
                        <CardDescription>
                          {slot ? `${slot.mediaType} - ${slot.pageType} - ${slot.position}` : "Slot details unavailable"}
                        </CardDescription>
                      </div>
                      <Badge>{booking.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <p className="font-medium">
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount:</span>
                        <p className="font-bold text-primary">₹{booking.totalAmount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
