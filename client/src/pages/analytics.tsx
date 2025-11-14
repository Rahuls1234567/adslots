import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, MousePointer, Eye, Target, BarChart as BarChartIcon } from "lucide-react";
import type { Booking, Slot } from "@shared/schema";

interface AnalyticsSummary {
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
}

interface AnalyticsData {
  data: Array<{
    id: number;
    bannerId: number;
    clicks: number;
    impressions: number;
    date: string;
  }>;
  summary: AnalyticsSummary;
}

export default function Analytics() {
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState<number | null>(null);

  // Fetch user's bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", { clientId: user?.id }],
    enabled: !!user && user.role === "client",
  });

  // Admin-wide data for removed dashboard analytics
  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user && user.role === "admin",
  });
  const { data: allSlots = [] } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
    enabled: !!user && user.role === "admin",
  });

  // Fetch analytics for selected booking
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/booking/${selectedBooking}`],
    enabled: !!selectedBooking,
  });

  // Auto-select first active booking
  if (bookings.length > 0 && !selectedBooking) {
    const activeBooking = bookings.find(b => b.status === "active");
    if (activeBooking) {
      setSelectedBooking(activeBooking.id);
    } else {
      setSelectedBooking(bookings[0].id);
    }
  }

  // Prepare chart data
  const chartData = analytics?.data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    impressions: d.impressions,
    clicks: d.clicks,
    ctr: d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : 0,
  })) || [];

  const exportToCSV = () => {
    if (!analytics) return;

    const csvContent = [
      ["Date", "Impressions", "Clicks", "CTR (%)"],
      ...analytics.data.map(d => [
        d.date,
        d.impressions,
        d.clicks,
        d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : 0,
      ]),
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-booking-${selectedBooking}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">
      {user?.role === "admin" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{allBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount.toString()), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allSlots.length}</div>
              <p className="text-xs text-muted-foreground">
                {allSlots.filter(s => s.status === "available").length} available
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChartIcon className="w-8 h-8" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Track your campaign performance</p>
        </div>
        {analytics && (
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Booking Selector */}
      {user?.role === "client" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground">No bookings found</p>
            ) : (
              <Select
                value={selectedBooking?.toString()}
                onValueChange={(value) => setSelectedBooking(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id.toString()}>
                      Booking #{booking.id} - {booking.startDate} to {booking.endDate} ({booking.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {analyticsLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.totalImpressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Times your ad was displayed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Times users clicked your ad
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.ctr}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of clicks vs impressions
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts */}
      {analyticsLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : analytics && chartData.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Impressions & Clicks Over Time</CardTitle>
              <CardDescription>Daily performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="impressions" stroke="#7334AE" strokeWidth={2} />
                  <Line type="monotone" dataKey="clicks" stroke="#34C759" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Impressions and clicks comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="impressions" fill="#7334AE" />
                  <Bar dataKey="clicks" fill="#34C759" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : selectedBooking ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No analytics data available yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Data will appear once your campaign starts receiving impressions
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
