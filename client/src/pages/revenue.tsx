import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Booking, Slot } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

const PAYABLE_STATUSES = new Set<Booking["status"]>(["pending_payment", "pending_deployment"]);
const ACTIVE_STATUSES = new Set<Booking["status"]>(["approved", "pending_deployment", "pending_payment", "active"]);
const COMPLETED_STATUSES = new Set<Booking["status"]>(["approved", "pending_deployment", "pending_payment", "active"]);

function formatCurrency(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  if (Number.isNaN(value)) return "₹0";
  return `₹${value.toLocaleString()}`;
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function RevenuePage() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Restrict to manager for now; other roles bounce to dashboard.
  if (user.role !== "manager") {
    return <Redirect to="/" />;
  }

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });

  const enrichedBookings = useMemo(() => {
    const slotMap = new Map(slots.map((slot) => [slot.id, slot]));
    return bookings.map((booking) => ({
      ...booking,
      slot: slotMap.get(booking.slotId),
    }));
  }, [bookings, slots]);

  const metrics = useMemo(() => {
    const totalRevenue = enrichedBookings
      .filter((booking) => COMPLETED_STATUSES.has(booking.status))
      .reduce((sum, booking) => sum + Number(booking.totalAmount ?? 0), 0);

    const pendingRevenue = enrichedBookings
      .filter((booking) => PAYABLE_STATUSES.has(booking.status))
      .reduce((sum, booking) => sum + Number(booking.totalAmount ?? 0), 0);

    const activeCampaigns = enrichedBookings.filter((booking) => ACTIVE_STATUSES.has(booking.status)).length;
    const averageDeal = enrichedBookings.length > 0 ? totalRevenue / enrichedBookings.length : 0;

    return {
      totalRevenue,
      pendingRevenue,
      activeCampaigns,
      averageDeal,
    };
  }, [enrichedBookings]);

  const isLoading = bookingsLoading || slotsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Revenue Overview</h1>
        <p className="text-muted-foreground">
          Track campaign earnings, outstanding payments, and booking performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CardDescription>Completed & active bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <div className="text-2xl font-semibold">{formatCurrency(metrics.totalRevenue)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <CardDescription>Awaiting settlement</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-2xl font-semibold text-orange-600">
                {formatCurrency(metrics.pendingRevenue)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <CardDescription>Running or scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <div className="text-2xl font-semibold text-emerald-600">{metrics.activeCampaigns}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
            <CardDescription>Across all bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-2xl font-semibold text-sky-600">
                {formatCurrency(metrics.averageDeal)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Ordered by most recent updates.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : enrichedBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No bookings recorded yet.
            </p>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedBookings
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((booking) => {
                      const slot = booking.slot;
                      const media = slot?.mediaType ?? "—";
                      const page =
                        slot?.mediaType === "website"
                          ? humanize(slot?.pageType)
                          : "";
                      const status = humanize(booking.status);
                      const amount = formatCurrency(booking.totalAmount);
                      const schedule = `${new Date(booking.startDate).toLocaleDateString()} → ${new Date(
                        booking.endDate
                      ).toLocaleDateString()}`;

                      return (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div className="font-medium">#{booking.id}</div>
                            {slot ? (
                              <div className="text-xs text-muted-foreground">
                                {humanize(slot.position)} • {slot.dimensions}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">Slot removed</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium capitalize">{media}</span>
                              {page && <span className="text-xs text-muted-foreground">{page}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{schedule}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                PAYABLE_STATUSES.has(booking.status)
                                  ? "destructive"
                                  : ACTIVE_STATUSES.has(booking.status)
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{amount}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

