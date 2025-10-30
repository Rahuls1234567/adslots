import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { AnimatedStatCard } from "@/components/animated-stat-card";
import { Calendar, TrendingUp, Package, DollarSign, BarChart } from "lucide-react";
import { type Booking } from "@shared/schema";

export default function Analytics() {
  const { user } = useAuth();

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", { clientId: user?.id }],
    enabled: !!user,
  });

  const activeBookings = bookings?.filter(b => b.status === "active") || [];
  const pendingBookings = bookings?.filter(b => 
    ["pending_manager", "pending_vp", "pending_pv", "pending_payment", "pending_deployment"].includes(b.status)
  ) || [];
  const totalRevenue = bookings?.reduce((sum, b) => sum + b.totalAmount, 0) || 0;
  const totalBookings = bookings?.length || 0;

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-analytics-title">
          <BarChart className="w-8 h-8" />
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your campaign performance and advertising metrics
        </p>
      </div>

      {bookingsLoading ? (
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-4">
          <AnimatedStatCard
            title="Active Campaigns"
            value={activeBookings.length}
            previousValue={activeBookings.length > 0 ? activeBookings.length - 1 : undefined}
            icon={TrendingUp}
            iconColor="text-green-600"
          />

          <AnimatedStatCard
            title="Pending Approvals"
            value={pendingBookings.length}
            previousValue={pendingBookings.length > 0 ? pendingBookings.length + 1 : undefined}
            icon={Calendar}
            iconColor="text-orange-600"
          />

          <AnimatedStatCard
            title="Total Bookings"
            value={totalBookings}
            previousValue={totalBookings > 0 ? totalBookings - 2 : undefined}
            icon={Package}
            iconColor="text-blue-600"
          />

          <AnimatedStatCard
            title="Total Investment"
            value={totalRevenue}
            previousValue={totalRevenue > 0 ? totalRevenue * 0.85 : undefined}
            prefix="₹"
            decimals={0}
            icon={DollarSign}
            iconColor="text-purple-600"
          />
        </div>
      )}

      {/* Campaign Performance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Overview of your advertising campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No campaign data available yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start booking ad slots to see your analytics
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                  <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Booking #{booking.id}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          booking.status === "active" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {booking.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {booking.startDate} - {booking.endDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">₹{booking.totalAmount}</div>
                      <div className="text-sm text-muted-foreground">{booking.paymentType}</div>
                    </div>
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
