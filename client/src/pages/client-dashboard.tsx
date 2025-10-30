import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { BookingModal } from "@/components/booking-modal";
import { SlotGrid } from "@/components/slot-grid";
import { Calendar, TrendingUp, Package, Monitor, Smartphone, Mail, BookOpen } from "lucide-react";
import { type Booking, type Slot, type MediaType } from "@shared/schema";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const handleBookSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setBookingModalOpen(true);
  };

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", { clientId: user?.id }],
    enabled: !!user,
  });

  const { data: slots, isLoading: slotsLoading } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });

  const availableSlots = slots?.filter(s => s.status === "available") || [];
  const activeBookings = bookings?.filter(b => b.status === "active") || [];
  const pendingBookings = bookings?.filter(b => 
    ["pending_manager", "pending_vp", "pending_pv", "pending_payment", "pending_deployment"].includes(b.status)
  ) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-client-dashboard-title">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">Manage your ad campaigns and bookings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-campaigns">{activeBookings.length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-approvals">{pendingBookings.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available-slots">{availableSlots.length}</div>
            <p className="text-xs text-muted-foreground">Ready to book</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Ad Slots</CardTitle>
          <CardDescription>Browse and select slots for your advertising campaigns across different media types</CardDescription>
        </CardHeader>
        <CardContent>
          {slotsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No available slots at the moment</p>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="website" data-testid="tab-website">
                  <Monitor className="h-4 w-4 mr-2" />
                  Website
                </TabsTrigger>
                <TabsTrigger value="mobile" data-testid="tab-mobile">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </TabsTrigger>
                <TabsTrigger value="email" data-testid="tab-email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="magazine" data-testid="tab-magazine">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Magazine
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <SlotGrid 
                  slots={availableSlots} 
                  onSlotBook={handleBookSlot}
                  mediaType="all"
                />
              </TabsContent>

              {(["website", "mobile", "email", "magazine"] as const).map((mediaType) => (
                <TabsContent key={mediaType} value={mediaType} className="mt-6">
                  <SlotGrid 
                    slots={availableSlots.filter((slot) => slot.mediaType === mediaType)}
                    onSlotBook={handleBookSlot}
                    mediaType={mediaType}
                  />
                  {availableSlots.filter((s) => s.mediaType === mediaType).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No {mediaType} slots available</p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {user && (
        <BookingModal
          slot={selectedSlot}
          userId={user.id}
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>Track the status of your advertising campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No bookings yet</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                  <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Booking #{booking.id}</span>
                        <Badge variant={
                          booking.status === "active" ? "default" :
                          booking.status === "rejected" ? "destructive" :
                          "secondary"
                        }>
                          {booking.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {booking.startDate} - {booking.endDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">₹{booking.totalAmount}</div>
                      <div className="text-sm text-muted-foreground">{booking.paymentType}</div>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`button-view-${booking.id}`}>
                      View Details
                    </Button>
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
