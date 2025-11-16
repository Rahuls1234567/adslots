import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Slot, Booking } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const MEDIA_OPTIONS: Array<{ value: "all" | Slot["mediaType"]; label: string }> = [
  { value: "all", label: "All media" },
  { value: "website", label: "Website" },
  { value: "mobile", label: "Mobile App" },
  { value: "magazine", label: "Magazine" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "Whatsapp" },
];

type DerivedStatus = "available" | "pending" | "booked" | "expired" | "blocked";

const STATUS_OPTIONS: Array<{ value: "all" | DerivedStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending" },
  { value: "booked", label: "Booked" },
  { value: "expired", label: "Expired" },
  { value: "blocked", label: "Blocked" },
];

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};
// Position filter will be populated dynamically from slots

const createSlotSchema = z.object({
  mediaType: z.enum(["website", "mobile", "email", "magazine", "whatsapp"]),
  pageType: z.string().min(1),
  position: z.string().min(1),
  dimensions: z.string().min(1),
  pricing: z.coerce.number().positive("Price must be positive"),
  status: z.enum(["available", "pending"]).default("available"),
});

// Helper function to map database media type to enum value
const mapMediaTypeToEnum = (dbMediaType: string): "website" | "mobile" | "email" | "magazine" | "whatsapp" => {
  const mapping: Record<string, "website" | "mobile" | "email" | "magazine" | "whatsapp"> = {
    "Website": "website",
    "Mobile APP": "mobile",
    "Email": "email",
    "Magazine": "magazine",
    "Whatsapp": "whatsapp",
  };
  return mapping[dbMediaType] || "website";
};

// Helper function to map enum value to database media type
const mapEnumToMediaType = (enumValue: string): string => {
  const mapping: Record<string, string> = {
    "website": "Website",
    "mobile": "Mobile APP",
    "email": "Email",
    "magazine": "Magazine",
    "whatsapp": "Whatsapp",
  };
  return mapping[enumValue] || enumValue;
};

type WorkOrderListEntry = {
  workOrder: {
    id: number;
    status: string;
  };
  items: Array<{
    slotId?: number | null;
    customSlotId?: string | null;
    slot?: { id: number } | null;
    addonType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
};

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function ManagerSlotsPage() {
  const { user } = useAuth();

  if (!user || user.role !== "manager") {
    return <Redirect to="/" />;
  }

  const { data: slots = [], isLoading } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });
  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<WorkOrderListEntry[]>({
    queryKey: ["/api/work-orders"],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [mediaFilter, setMediaFilter] = useState<(typeof MEDIA_OPTIONS)[number]["value"]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Reset position filter when media type changes
  const handleMediaFilterChange = (value: string) => {
    setMediaFilter(value as any);
    setPositionFilter("all"); // Reset position filter when media type changes
  };

  const { toast } = useToast();

  const createSlotForm = useForm<z.infer<typeof createSlotSchema>>({
    resolver: zodResolver(createSlotSchema),
    defaultValues: {
      mediaType: "website",
      pageType: "other", // Default page type (hidden from form)
      position: "",
      dimensions: "728x90", // Default dimensions
      pricing: 0,
      status: "available",
    },
  });

  // Fetch media types from database
  const { data: mediaTypesData, isLoading: isLoadingMediaTypes, error: mediaTypesError } = useQuery<string[]>({
    queryKey: ["/api/media-types"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/media-types");
      const result = await response.json();
      return Array.isArray(result) ? result : [];
    },
    retry: 1,
  });

  // Fallback to default media types if API fails or returns empty
  const allMediaTypes = mediaTypesData && mediaTypesData.length > 0 
    ? mediaTypesData 
    : ["Website", "Mobile APP", "Email", "Magazine", "Whatsapp"];
  
  // Filter to only include valid media types that match the schema enum
  const validMediaTypes = ["Website", "Mobile APP", "Email", "Magazine", "Whatsapp"];
  const mediaTypes = allMediaTypes.filter(mt => validMediaTypes.includes(mt));

  // Get selected media type from form
  const selectedMediaType = createSlotForm.watch("mediaType") || "website";
  const dbMediaType = selectedMediaType ? mapEnumToMediaType(selectedMediaType) : null;

  // Fetch positions based on selected media type
  const { data: positionsData, error: positionsError, isLoading: isLoadingPositions } = useQuery<string[]>({
    queryKey: ["/api/positions", dbMediaType],
    queryFn: async () => {
      if (!dbMediaType) return [];
      try {
        const response = await apiRequest("GET", `/api/positions?mediaType=${encodeURIComponent(dbMediaType)}`);
        const result = await response.json();
        console.log("Positions fetched for", dbMediaType, ":", result);
        const positionsArray = Array.isArray(result) ? result : [];
        console.log("Positions array:", positionsArray, "Length:", positionsArray.length);
        return positionsArray;
      } catch (error) {
        console.error("Error fetching positions:", error);
        return [];
      }
    },
    enabled: !!dbMediaType && !!selectedMediaType,
    retry: 1,
    staleTime: 0, // Always refetch when media type changes
  });

  // Ensure positions is always an array
  const positions = Array.isArray(positionsData) ? positionsData : [];

  const createSlotMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof createSlotSchema>) => {
      return await apiRequest("POST", "/api/slots", {
        ...payload,
        pricing: String(payload.pricing),
        createdById: user?.id,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/slots"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
      ]);
      toast({ title: "Slot created", description: "New slot is ready to use." });
      createSlotForm.reset();
      setCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create slot",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const enhancedSlots = useMemo(() => {
    const busyStatuses = new Set<Booking["status"]>([
      "pending_manager",
      "pending_vp",
      "pending_pv",
      "pending_payment",
      "pending_deployment",
      "approved",
      "active",
      "paused",
    ]);
    const workOrderBusyStatuses = new Set<string>([
      "quoted",
      "client_accepted",
      "paid",
      "active",
    ]);
    const now = new Date();

    return (slots || []).map((slot) => {
      const activeBooking = (bookings || []).find((booking) => {
        if (booking.slotId !== slot.id) return false;
        if (!busyStatuses.has(booking.status as Booking["status"])) return false;
        const bookingEnd = new Date(booking.endDate);
        return bookingEnd >= now;
      });
      const activeWorkOrder = (workOrders || []).find(({ workOrder, items }) => {
        if (!workOrderBusyStatuses.has(workOrder.status)) return false;
        // Match by slotId (integer), slot.id from nested object, or customSlotId (string)
        return items.some((item) => {
          if (item.slotId === slot.id) return true;
          if (item.slot?.id === slot.id) return true;
          if (item.customSlotId && slot.slotId && item.customSlotId === slot.slotId) return true;
          return false;
        });
      });
      
      // Get the work order item that matches this slot for date range
      const matchingWorkOrderItem = activeWorkOrder?.items.find((item) => {
        if (item.slotId === slot.id) return true;
        if (item.slot?.id === slot.id) return true;
        if (item.customSlotId && slot.slotId && item.customSlotId === slot.slotId) return true;
        return false;
      });

      let derivedStatus: DerivedStatus = slot.status as DerivedStatus;
      if (slot.isBlocked) {
        derivedStatus = "blocked";
      } else if (activeBooking || activeWorkOrder) {
        derivedStatus = "booked";
      } else if (slot.status === "available" || slot.status === "pending" || slot.status === "expired") {
        derivedStatus = slot.status as DerivedStatus;
      } else {
        derivedStatus = "available";
      }

      return {
        ...slot,
        derivedStatus,
        activeBooking,
        activeWorkOrder,
        matchingWorkOrderItem,
      } as Slot & {
        derivedStatus: DerivedStatus;
        activeBooking?: Booking;
        activeWorkOrder?: WorkOrderListEntry;
        matchingWorkOrderItem?: { startDate?: string | null; endDate?: string | null };
      };
    });
  }, [slots, bookings, workOrders]);

  // Get selected media type for position filter (convert enum to database format)
  const filterMediaType = mediaFilter !== "all" ? mapEnumToMediaType(mediaFilter) : null;

  // Fetch positions from database based on selected media type (like in create slot form)
  const { data: filterPositionsData, error: filterPositionsError, isLoading: isLoadingFilterPositions } = useQuery<string[]>({
    queryKey: ["/api/positions", filterMediaType],
    queryFn: async () => {
      if (!filterMediaType) return [];
      try {
        const response = await apiRequest("GET", `/api/positions?mediaType=${encodeURIComponent(filterMediaType)}`);
        const result = await response.json();
        const positionsArray = Array.isArray(result) ? result : [];
        return positionsArray;
      } catch (error) {
        console.error("Error fetching positions for filter:", error);
        return [];
      }
    },
    enabled: !!filterMediaType && mediaFilter !== "all",
    retry: 1,
    staleTime: 0,
  });

  // Position options for filter dropdown
  const positionOptions = useMemo(() => {
    if (mediaFilter === "all") {
      // When "all" is selected, show all unique positions from existing slots
      const uniquePositions = new Set<string>();
      (enhancedSlots || []).forEach((slot) => {
        if (slot.position) {
          uniquePositions.add(slot.position);
        }
      });
      return Array.from(uniquePositions).sort();
    } else {
      // When specific media type is selected, use positions from database API
      return Array.isArray(filterPositionsData) ? filterPositionsData.sort() : [];
    }
  }, [enhancedSlots, mediaFilter, filterPositionsData]);

  const filteredSlots = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = (enhancedSlots || []).filter((slot) => {
      if (mediaFilter !== "all" && slot.mediaType !== mediaFilter) return false;
      if (statusFilter !== "all" && slot.derivedStatus !== statusFilter) return false;
      if (positionFilter !== "all" && slot.position !== positionFilter) return false;
      if (!term) return true;
      const haystack = [
        slot.id,
        slot.mediaType,
        slot.pageType,
        slot.position,
        slot.dimensions,
        slot.pricing,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(term));
    });
    
    // Sort by createdAt (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Newest first
    });
  }, [enhancedSlots, mediaFilter, statusFilter, positionFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = enhancedSlots.length;
    const byStatus = STATUS_OPTIONS.reduce<Record<DerivedStatus, number>>((acc, option) => {
      if (option.value === "all") return acc;
      acc[option.value] = enhancedSlots.filter((slot) => slot.derivedStatus === option.value).length;
      return acc;
    }, {} as Record<DerivedStatus, number>);
    return { total, byStatus };
  }, [enhancedSlots]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Slots</h1>
          <p className="text-muted-foreground">
            Inspect and filter the slots that are available for campaign planning.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              Create Slot
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Slot</DialogTitle>
              <DialogDescription>
                Define a new placement to make it available for upcoming campaigns.
              </DialogDescription>
            </DialogHeader>
            <Form {...createSlotForm}>
              <form
                onSubmit={createSlotForm.handleSubmit((values) => createSlotMutation.mutate(values))}
                className="space-y-4"
              >
                {mediaTypesError && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-md">
                    Using default media types. Database connection may be unavailable.
                  </div>
                )}
                {positionsError && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-md">
                    Could not load positions. You can still enter a position manually.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createSlotForm.control}
                    name="mediaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media Type</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset position when media type changes
                            createSlotForm.setValue("position", "");
                          }} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select media type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mediaTypes.map((mediaType) => {
                              const enumValue = mapMediaTypeToEnum(mediaType);
                              return (
                                <SelectItem key={`${mediaType}-${enumValue}`} value={enumValue}>
                                  {mediaType}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createSlotForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="booked">Booked</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createSlotForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select 
                        key={`position-select-${dbMediaType}-${positions.length}`}
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                        disabled={!selectedMediaType || isLoadingPositions}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              isLoadingPositions 
                                ? "Loading..." 
                                : !selectedMediaType 
                                  ? "Select media type first" 
                                  : positions.length === 0 
                                    ? "No positions available" 
                                    : "Select position"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingPositions ? (
                            <SelectItem value="loading" disabled>Loading positions...</SelectItem>
                          ) : positionsError ? (
                            <SelectItem value="error" disabled>Error loading positions</SelectItem>
                          ) : positions && Array.isArray(positions) && positions.length > 0 ? (
                            positions.map((position, index) => (
                              <SelectItem key={`${position}-${index}`} value={position}>
                                {position}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="manual" disabled>
                              {selectedMediaType ? `No positions found for ${dbMediaType}. Enter manually below.` : "Select media type first"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createSlotForm.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 728x90" {...field} value={field.value || "728x90"} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createSlotForm.control}
                  name="pricing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSlotMutation.isPending}>
                    {createSlotMutation.isPending ? "Creating..." : "Create Slot"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
            <CardDescription>Across all media types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </CardContent>
        </Card>
        {STATUS_OPTIONS.filter((opt) => opt.value !== "all").map((option) => (
          <Card key={option.value}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{option.label}</CardTitle>
              <CardDescription>Status overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {stats.byStatus[option.value] ?? 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Slot Directory</CardTitle>
          <CardDescription>Use filters to narrow down slots by media type, availability or keywords.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              placeholder="Search by ID, page, position or dimensions"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full lg:max-w-sm"
            />
            <div className="flex flex-wrap gap-3">
              <Select value={mediaFilter} onValueChange={handleMediaFilterChange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Media type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All media</SelectItem>
                  {mediaTypes.map((mediaType) => {
                    const enumValue = mapMediaTypeToEnum(mediaType);
                    return (
                      <SelectItem key={mediaType} value={enumValue}>
                        {mediaType}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={positionFilter}
                onValueChange={(value) => setPositionFilter(value)}
                disabled={mediaFilter === "all" || isLoadingFilterPositions || positionOptions.length === 0}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={
                    mediaFilter === "all" 
                      ? "Select media type first" 
                      : isLoadingFilterPositions
                        ? "Loading..."
                        : positionOptions.length === 0
                          ? "No positions available"
                          : "Position"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All positions</SelectItem>
                  {isLoadingFilterPositions ? (
                    <SelectItem value="loading" disabled>Loading positions...</SelectItem>
                  ) : filterPositionsError ? (
                    <SelectItem value="error" disabled>Error loading positions</SelectItem>
                  ) : positionOptions.length > 0 ? (
                    positionOptions.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {mediaFilter === "all" ? "Select media type first" : "No positions available"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading || bookingsLoading || workOrdersLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              No slots match the current filters.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredSlots.map((slot) => (
                <div key={slot.id} className="space-y-2 rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{slot.slotId || `#${slot.id}`}</span>
                    <Badge variant={slot.derivedStatus === "available" ? "secondary" : slot.derivedStatus === "booked" || slot.derivedStatus === "blocked" ? "destructive" : "outline"}>
                      {slot.derivedStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Media</span>
                      <span className="font-medium text-foreground capitalize">{slot.mediaType}</span>
                    </div>
                    {slot.mediaType === "website" && (
                      <div className="flex items-center justify-between">
                        <span>Page</span>
                        <span className="font-medium text-foreground">
                          {PAGE_LABELS[slot.pageType as keyof typeof PAGE_LABELS] ?? humanize(slot.pageType)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Position</span>
                      <span className="font-medium text-foreground">{humanize(slot.position)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Dimensions</span>
                      <span className="font-medium text-foreground">{slot.dimensions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Price</span>
                      <span className="font-semibold text-foreground">
                        ₹{Number(slot.pricing ?? 0).toLocaleString()}
                      </span>
                    </div>
                    {slot.derivedStatus === "booked" && slot.activeBooking && (
                      <div className="flex items-center justify-between text-blue-600">
                        <span>Booked</span>
                        <span className="font-medium text-xs">
                          {new Date(slot.activeBooking.startDate).toLocaleDateString()} - {new Date(slot.activeBooking.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {slot.derivedStatus === "booked" && !slot.activeBooking && slot.activeWorkOrder && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-blue-600">
                          <span>Work Order</span>
                          <span className="font-medium">
                            #{slot.activeWorkOrder.workOrder.id} • {slot.activeWorkOrder.workOrder.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        {slot.matchingWorkOrderItem && slot.matchingWorkOrderItem.startDate && slot.matchingWorkOrderItem.endDate && (
                          <div className="flex items-center justify-between text-blue-600 text-xs">
                            <span>Booked</span>
                            <span className="font-medium">
                              {new Date(slot.matchingWorkOrderItem.startDate).toLocaleDateString()} - {new Date(slot.matchingWorkOrderItem.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {slot.isBlocked && (
                      <div className="flex items-center justify-between text-amber-600">
                        <span>Blocked</span>
                        <span className="font-medium">{slot.blockReason || "Temporarily unavailable"}</span>
                      </div>
                    )}
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


