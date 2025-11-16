import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Define a client-only schema to avoid importing server/drizzle code in the browser
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, AlertCircle, TrendingUp, DollarSign, Plus, FileText, Calendar as CalendarIcon, Package, ArrowRight, Clock, Users, Lock, Unlock, Ban, MessageSquare } from "lucide-react";
import type { Booking, Slot } from "@shared/schema";
import { useLocation } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/lib/auth-context";

const humanize = (value?: string | null) => {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

const slotFormSchema = z.object({
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

export default function ManagerDashboard() {
  const [createSlotOpen, setCreateSlotOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<{ slotId?: number; reason?: string; start?: string; end?: string; mediaType?: "website" | "mobile" | "magazine" | "email" | "whatsapp"; pageType?: string }>({});
  const [blockStartDate, setBlockStartDate] = useState<Date | null>(null);
  const [blockEndDate, setBlockEndDate] = useState<Date | null>(null);

  // Initialize form first (needed for form.watch)
  const form = useForm<z.infer<typeof slotFormSchema>>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: {
      mediaType: "website",
      pageType: "other", // Default page type (hidden from form)
      position: "",
      dimensions: "728x90", // Default dimensions
      pricing: 0,
      status: "available",
    },
  });

  // Load all slots for dropdown selection
  const { data: allSlots = [] } = useQuery<Slot[]>({ queryKey: ["/api/slots"] });
  const filteredSlots = (allSlots || []).filter((s) => {
    if (blockForm.mediaType && s.mediaType !== blockForm.mediaType) return false;
    if (blockForm.mediaType === "website" && blockForm.pageType && s.pageType !== blockForm.pageType) return false;
    return true;
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

  // Get selected media type from form (safely)
  const selectedMediaType = form.watch("mediaType") || "website";
  const dbMediaType = selectedMediaType ? mapEnumToMediaType(selectedMediaType) : null;

  // Fetch positions based on selected media type
  const { data: positionsData, error: positionsError, isLoading: isLoadingPositions, refetch: refetchPositions } = useQuery<string[]>({
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

  // Debug: Log positions when they change
  useEffect(() => {
    console.log("Positions state:", {
      positions,
      positionsData,
      length: positions?.length,
      dbMediaType,
      selectedMediaType,
      isLoadingPositions,
      positionsError,
      isArray: Array.isArray(positions)
    });
  }, [positions, positionsData, dbMediaType, selectedMediaType, isLoadingPositions, positionsError]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Work Orders (requests raised by clients)
  const { data: workOrdersData = [], isLoading: woLoading } = useQuery<{ workOrder: any; items: any[] }[]>({
    queryKey: ["/api/work-orders"],
  });

  // Sort pending work orders by creation date (newest first)
  const pendingWorkOrders = useMemo(() => {
    return (workOrdersData || [])
      .filter(w => w.workOrder.status === "draft")
      .sort((a, b) => {
        const dateA = new Date(a.workOrder.createdAt).getTime();
        const dateB = new Date(b.workOrder.createdAt).getTime();
        return dateB - dateA; // Newest first
      });
  }, [workOrdersData]);

  // Email/WhatsApp pricing section removed per requirements

  // Slot pricing editor removed per requirements

  const pendingBookings = bookings?.filter(b => b.status === "pending_manager") || [];
  const approvedBookings = bookings?.filter(b => 
    ["pending_vp", "pending_pv", "pending_payment", "pending_deployment", "approved", "active"].includes(b.status)
  ) || [];
  const rejectedBookings = bookings?.filter(b => b.status === "rejected") || [];
  const totalRevenue = bookings?.reduce((sum, b) => sum + parseFloat(b.totalAmount.toString()), 0) || 0;

  const createSlotMutation = useMutation({
    mutationFn: async (data: z.infer<typeof slotFormSchema>) => {
      return await apiRequest("POST", "/api/slots", {
        ...data,
        pricing: String(data.pricing),
        createdById: user?.id,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
      toast({
        title: "Slot Created",
        description: "The new ad slot has been created successfully.",
      });
      form.reset();
      setCreateSlotOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create slot",
        variant: "destructive",
      });
    },
  });

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

  const onSubmit = (data: z.infer<typeof slotFormSchema>) => {
    createSlotMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-manager-dashboard-title">Manager Dashboard</h1>
          <p className="text-muted-foreground">Review and approve client requests</p>
        </div>
        <Dialog open={createSlotOpen} onOpenChange={setCreateSlotOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-slot">
              <Plus className="mr-2 h-4 w-4" />
              Create Slot
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Ad Slot</DialogTitle>
              <DialogDescription>
                Define a new advertising slot for your platform
              </DialogDescription>
            </DialogHeader>
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mediaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media Type</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            console.log("Media type changed to:", value);
                            field.onChange(value);
                            // Reset position when media type changes
                            form.setValue("position", "");
                          }} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-media-type">
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
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
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
                          <SelectTrigger data-testid="select-position">
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 728x90" {...field} data-testid="input-dimensions" value={field.value || "728x90"} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-pricing" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateSlotOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSlotMutation.isPending} data-testid="button-submit-slot">
                    {createSlotMutation.isPending ? "Creating..." : "Create Slot"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Work Orders</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-count">{pendingWorkOrders.length}</div>
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

      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-orange-50/50 to-background dark:from-orange-950/10 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Pending Work Orders</CardTitle>
              <CardDescription>Requests raised by clients awaiting your quotation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {woLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : pendingWorkOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground">No pending work orders</p>
                <p className="text-sm text-muted-foreground">All work orders have been processed</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingWorkOrders.map(({ workOrder, items }) => {
                const workOrderId = workOrder.customWorkOrderId || `WO #${workOrder.id}`;
                const createdAt = new Date(workOrder.createdAt);
                const clientName = workOrder.businessSchoolName || workOrder.contactName || `Client #${workOrder.clientId}`;
                const hasAmount = Number(workOrder.totalAmount) > 0 || workOrder.status === 'quoted';

                return (
                  <Card
                    key={workOrder.id}
                    className="border-2 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/20 group"
                    onClick={() => navigate(`/work-orders/${workOrder.customWorkOrderId || workOrder.id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-row items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{workOrderId}</span>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                                  Draft
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Users className="w-3 h-3" />
                                <span>{clientName}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Package className="w-4 h-4" />
                              <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span className="text-muted-foreground">•</span>
                              <Clock className="w-3 h-3" />
                              <span>{createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount</div>
                          {hasAmount ? (
                            <div className="text-2xl font-bold text-primary">₹{Number(workOrder.totalAmount).toLocaleString()}</div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Yet to be quoted
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <span className="text-sm text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                              View details
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing controls removed as requested */}

      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-red-50/50 to-background dark:from-red-950/10 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Manual Slot Blocking</CardTitle>
              <CardDescription>Reserve or block slots for internal needs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Media Type
              </label>
              <Select value={blockForm.mediaType} onValueChange={(v) => {
                setBlockForm({ ...blockForm, mediaType: v as any, pageType: v === "website" ? (blockForm.pageType || "main") : undefined, slotId: undefined });
              }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select media type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="mobile">Mobile App</SelectItem>
                  <SelectItem value="magazine">Magazine</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">Whatsapp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {blockForm.mediaType === "website" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Page Type
                </label>
                <Select value={blockForm.pageType} onValueChange={(v) => setBlockForm({ ...blockForm, pageType: v, slotId: undefined })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select page type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Landing page</SelectItem>
                    <SelectItem value="student_home">Student home page</SelectItem>
                    <SelectItem value="student_login">Login page</SelectItem>
                    <SelectItem value="aimcat_results_analysis">AIMCAT results and analysis page</SelectItem>
                    <SelectItem value="chat_pages">Chat pages</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className={`space-y-2 ${blockForm.mediaType === "website" ? "lg:col-span-1" : "lg:col-span-2"}`}>
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Slot
              </label>
              <Select
                value={blockForm.slotId ? String(blockForm.slotId) : undefined}
                onValueChange={(v) => setBlockForm({ ...blockForm, slotId: Number(v) })}
                disabled={!blockForm.mediaType}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={blockForm.mediaType ? "Select slot" : "Select media type first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSlots.length === 0 ? (
                    <SelectItem value="none" disabled>No slots available</SelectItem>
                  ) : (
                    filteredSlots.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {`${s.mediaType === "website" ? "Website" : humanize(s.mediaType)}${
                          s.mediaType === "website" ? ` • ${humanize(s.pageType)}` : ""
                        } • ${humanize(s.position)}`} • {s.dimensions} {s.slotId ? `(${s.slotId})` : `(#${s.id})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    readOnly
                    value={blockStartDate ? new Date(blockStartDate).toLocaleDateString() : ""}
                    placeholder="Select start date"
                    className="h-11 cursor-pointer"
                  />
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0">
                  <Calendar
                    mode="single"
                    selected={blockStartDate as any}
                    onSelect={(d: any) => {
                      setBlockStartDate(d || null);
                      const s = d ? new Date(d).toISOString().split("T")[0] : "";
                      setBlockForm({ ...blockForm, start: s });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    readOnly
                    value={blockEndDate ? new Date(blockEndDate).toLocaleDateString() : ""}
                    placeholder="Select end date"
                    className="h-11 cursor-pointer"
                  />
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0">
                  <Calendar
                    mode="single"
                    selected={blockEndDate as any}
                    onSelect={(d: any) => {
                      setBlockEndDate(d || null);
                      const e = d ? new Date(d).toISOString().split("T")[0] : "";
                      setBlockForm({ ...blockForm, end: e });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Reason (Optional)
            </label>
            <Input 
              placeholder="Enter reason for blocking this slot..." 
              value={blockForm.reason || ""} 
              onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={async () => {
                if (!blockForm.slotId) { toast({ title: "Slot ID required", variant: "destructive" }); return; }
                const selectedSlot = filteredSlots.find(s => s.id === blockForm.slotId);
                const slotDisplayId = selectedSlot?.slotId || `#${blockForm.slotId}`;
                try {
                  await fetch(`/api/slots/${blockForm.slotId}/unblock`, { method: "POST" }).then(r => r.ok ? r.json() : Promise.reject(r));
                  toast({ title: "Unblocked", description: `Slot ${slotDisplayId} is now available` });
                  setBlockForm({});
                  setBlockStartDate(null);
                  setBlockEndDate(null);
                } catch {
                  toast({ title: "Failed", description: "Could not unblock slot", variant: "destructive" });
                }
              }}
              disabled={!blockForm.slotId}
              className="gap-2"
            >
              <Unlock className="w-4 h-4" />
              Unblock Slot
            </Button>
            <Button 
              onClick={async () => {
                if (!blockForm.slotId) { toast({ title: "Slot ID required", variant: "destructive" }); return; }
                const selectedSlot = filteredSlots.find(s => s.id === blockForm.slotId);
                const slotDisplayId = selectedSlot?.slotId || `#${blockForm.slotId}`;
                try {
                  await fetch(`/api/slots/${blockForm.slotId}/block`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: blockForm.reason, startDate: blockForm.start, endDate: blockForm.end }),
                  }).then(async (r) => {
                    if (!r.ok) {
                      let msg = "Failed to block";
                      try { const j = await r.json(); msg = j?.error || msg; } catch {}
                      throw new Error(msg);
                    }
                    return r.json();
                  });
                  toast({ title: "Blocked", description: `Slot ${slotDisplayId} blocked` });
                  setBlockForm({});
                  setBlockStartDate(null);
                  setBlockEndDate(null);
                } catch {
                  toast({ title: "Failed", description: "Cannot block this slot because it overlaps with a client work order.", variant: "destructive" });
                }
              }}
              disabled={!blockForm.slotId}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <Lock className="w-4 h-4" />
              Block Slot
            </Button>
          </div>
        </CardContent>
      </Card>

     
    </div>
  );
}
