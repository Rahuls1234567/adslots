import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { DateRangePicker } from "@/components/date-range-picker";
import { SlotGrid } from "@/components/slot-grid";
import { BookingModal } from "@/components/booking-modal";
import { type Slot } from "@shared/schema";
import { Monitor } from "lucide-react";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>("main");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Fetch available slots based on selected dates and page
  const { data: availableSlots, isLoading } = useQuery<Slot[]>({
    queryKey: ["/api/slots/available", { 
      startDate: startDate?.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
      pageType: selectedPage 
    }],
    enabled: !!startDate && !!endDate,
  });

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleBookSlot = (slot: Slot) => {
    if (!startDate || !endDate) {
      return;
    }
    setSelectedSlot(slot);
    setBookingModalOpen(true);
  };

  // Filter slots to only show website type
  const filteredSlots = availableSlots?.filter(slot => slot.mediaType === "website") || [];

  const pageTypes = [
    { value: "main", label: "Landing Page" },
    { value: "course", label: "Course Page" },
    { value: "webinar", label: "Webinar Page" },
    { value: "student_login", label: "Student Login" },
    { value: "student_home", label: "Student Home" },
    { value: "other", label: "Other Pages" },
  ];

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Date Picker (25%) */}
      <div className="w-80 border-r bg-muted/30 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
            Welcome, {user?.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select your ad campaign dates
          </p>
        </div>

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />

        {startDate && endDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Selected Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">
                    {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Slots Available:</span>
                  <span className="font-medium text-primary">
                    {filteredSlots.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Main Area - Slot Selection (75%) */}
      <div className="flex-1 p-8 space-y-6 overflow-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Select Slots</CardTitle>
                <CardDescription className="mt-1">
                  Choose your advertising slots for the selected dates
                </CardDescription>
              </div>
              <Monitor className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Page Selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Website</span>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger className="w-64" data-testid="select-page-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageTypes.map((page) => (
                    <SelectItem key={page.value} value={page.value}>
                      {page.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slot Grid */}
            {!startDate || !endDate ? (
              <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">
                  Please select start and end dates to view available slots
                </p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">
                  No slots available for the selected page and dates
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border p-6">
                <SlotGrid
                  slots={filteredSlots}
                  onSlotBook={handleBookSlot}
                  mediaType="website"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user && (
        <BookingModal
          slot={selectedSlot}
          userId={user.id}
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          startDate={startDate?.toISOString().split('T')[0] || ''}
          endDate={endDate?.toISOString().split('T')[0] || ''}
        />
      )}
    </div>
  );
}
