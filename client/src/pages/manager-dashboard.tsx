import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import type { Booking, Approval } from "@shared/schema";

export default function ManagerDashboard() {
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery<Approval[]>({
    queryKey: ["/api/approvals/pending", "manager"],
  });

  const pendingBookings = bookings?.filter(b => b.status === "pending_manager") || [];
  const approvedBookings = bookings?.filter(b => 
    !["pending_manager", "rejected"].includes(b.status)
  ) || [];
  const totalRevenue = bookings?.reduce((sum, b) => sum + parseFloat(b.totalAmount.toString()), 0) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-manager-dashboard-title">Manager Dashboard</h1>
        <p className="text-muted-foreground">Review and approve client requests</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-count">{pendingBookings.length}</div>
            <p className="text-xs text-muted-foreground">Require your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-approved-count">{approvedBookings.length}</div>
            <p className="text-xs text-muted-foreground">In current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-expiring-count">0</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Review and approve client advertising requests</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : pendingBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending approvals</p>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <Card key={booking.id} className="hover-elevate" data-testid={`card-booking-${booking.id}`}>
                  <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Booking #{booking.id}</span>
                        <Badge variant="secondary">Pending Review</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Slot ID: {booking.slotId} • {booking.startDate} - {booking.endDate}
                      </div>
                      <div className="font-medium mt-2">Amount: ₹{booking.totalAmount}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-${booking.id}`}>
                        View Details
                      </Button>
                      <Button variant="destructive" size="sm" data-testid={`button-reject-${booking.id}`}>
                        Reject
                      </Button>
                      <Button size="sm" data-testid={`button-approve-${booking.id}`}>
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>Complete list of advertising campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No bookings yet</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`row-booking-${booking.id}`}
                >
                  <div className="flex-1">
                    <span className="font-medium">Booking #{booking.id}</span>
                    <span className="text-sm text-muted-foreground ml-4">
                      {booking.startDate} - {booking.endDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={
                      booking.status === "active" ? "default" :
                      booking.status === "rejected" ? "destructive" :
                      "secondary"
                    }>
                      {booking.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-medium">₹{booking.totalAmount}</span>
                    <Button variant="ghost" size="sm" data-testid={`button-details-${booking.id}`}>
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
