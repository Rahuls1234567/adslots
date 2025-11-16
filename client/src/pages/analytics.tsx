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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header Section */}
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChartIcon className="w-6 h-6 text-primary" />
                </div>
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground text-base">
                Track your campaign performance and insights
              </p>
            </div>
            {analytics && (
              <Button onClick={exportToCSV} variant="outline" className="gap-2 h-11">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Admin Stats */}
          {user?.role === "admin" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-2 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ₹{allBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount.toString()), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">All time revenue</p>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{allSlots.length}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {allSlots.filter(s => s.status === "available").length} available
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">

          {/* Booking Selector */}
          {user?.role === "client" && (
            <Card className="shadow-lg border-2">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Select Campaign
                </CardTitle>
                <CardDescription>Choose a campaign to view its analytics</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <Skeleton className="h-11 w-full rounded-lg" />
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No bookings found</p>
                  </div>
                ) : (
                  <Select
                    value={selectedBooking?.toString()}
                    onValueChange={(value) => setSelectedBooking(parseInt(value))}
                  >
                    <SelectTrigger className="w-full h-11">
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
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : analytics ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{analytics.summary.totalImpressions.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Times your ad was displayed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <MousePointer className="h-6 w-6 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{analytics.summary.totalClicks.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Times users clicked your ad
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{analytics.summary.ctr}%</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Percentage of clicks vs impressions
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Charts */}
          {analyticsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-96 rounded-lg" />
              <Skeleton className="h-96 rounded-lg" />
            </div>
          ) : analytics && chartData.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-lg border-2">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Impressions & Clicks Over Time</CardTitle>
                  <CardDescription>Daily performance metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Line type="monotone" dataKey="impressions" stroke="#7334AE" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="clicks" stroke="#34C759" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-2">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Daily Performance</CardTitle>
                  <CardDescription>Impressions and clicks comparison by day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="impressions" fill="#7334AE" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="clicks" fill="#34C759" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : selectedBooking ? (
            <Card className="border-2 border-dashed shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No analytics data available yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Data will appear once your campaign starts receiving impressions and user interactions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
