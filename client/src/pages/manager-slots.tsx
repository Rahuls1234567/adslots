import { useMemo, useState } from "react";
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
const PAGE_OPTIONS: Array<{ value: "all" | keyof typeof PAGE_LABELS | "other"; label: string }> = [
  { value: "all", label: "All pages" },
  { value: "main", label: PAGE_LABELS.main },
  { value: "student_home", label: PAGE_LABELS.student_home },
  { value: "student_login", label: PAGE_LABELS.student_login },
  { value: "aimcat_results_analysis", label: PAGE_LABELS.aimcat_results_analysis },
  { value: "chat_pages", label: PAGE_LABELS.chat_pages },
  { value: "other", label: "Other" },
];

const createSlotSchema = z.object({
  mediaType: z.enum(["website", "mobile", "email", "magazine"]),
  pageType: z.string().min(1),
  position: z.string().min(1),
  dimensions: z.string().min(1),
  pricing: z.coerce.number().positive("Price must be positive"),
  status: z.enum(["available", "pending"]).default("available"),
});

type WorkOrderListEntry = {
  workOrder: {
    id: number;
    status: string;
  };
  items: Array<{
    slotId: number | null;
    addonType?: string | null;
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
  const [pageFilter, setPageFilter] = useState<(typeof PAGE_OPTIONS)[number]["value"]>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { toast } = useToast();

  const createSlotForm = useForm<z.infer<typeof createSlotSchema>>({
    resolver: zodResolver(createSlotSchema),
    defaultValues: {
      mediaType: "website",
      pageType: "main",
      position: "",
      dimensions: "",
      pricing: 0,
      status: "available",
    },
  });

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
        return items.some((item) => item.slotId === slot.id);
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
      } as Slot & {
        derivedStatus: DerivedStatus;
        activeBooking?: Booking;
        activeWorkOrder?: WorkOrderListEntry;
      };
    });
  }, [slots, bookings, workOrders]);

  const filteredSlots = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (enhancedSlots || []).filter((slot) => {
      if (mediaFilter !== "all" && slot.mediaType !== mediaFilter) return false;
      if (statusFilter !== "all" && slot.derivedStatus !== statusFilter) return false;
      if (pageFilter !== "all") {
        if (pageFilter === "other") {
          if (slot.mediaType === "website" && Object.keys(PAGE_LABELS).includes(slot.pageType)) return false;
        } else if (slot.pageType !== pageFilter) {
          return false;
        }
      }
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
  }, [enhancedSlots, mediaFilter, statusFilter, searchTerm]);

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createSlotForm.control}
                    name="mediaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select media type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="mobile">Mobile App</SelectItem>
                            <SelectItem value="magazine">Magazine</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
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
                  name="pageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select page type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAGE_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createSlotForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Header, Sidebar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createSlotForm.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 728x90" {...field} />
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
              <Select value={mediaFilter} onValueChange={(value) => setMediaFilter(value as any)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Media type" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                value={pageFilter}
                onValueChange={(value) => setPageFilter(value as any)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Page" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                        <span>Booked until</span>
                        <span className="font-medium">
                          {new Date(slot.activeBooking.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {slot.derivedStatus === "booked" && !slot.activeBooking && slot.activeWorkOrder && (
                      <div className="flex items-center justify-between text-blue-600">
                        <span>Work Order</span>
                        <span className="font-medium">
                          #{slot.activeWorkOrder.workOrder.id} • {slot.activeWorkOrder.workOrder.status.replace(/_/g, " ")}
                        </span>
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


