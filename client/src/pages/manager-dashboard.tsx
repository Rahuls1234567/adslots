import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Define a client-only schema to avoid importing server/drizzle code in the browser
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, AlertCircle, TrendingUp, DollarSign, Plus } from "lucide-react";
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
  mediaType: z.enum(["website", "mobile", "email", "magazine"]),
  pageType: z.string().min(1),
  position: z.string().min(1),
  dimensions: z.string().min(1),
  pricing: z.coerce.number().positive("Price must be positive"),
  status: z.enum(["available", "pending"]).default("available"),
});

export default function ManagerDashboard() {
  const [createSlotOpen, setCreateSlotOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<{ slotId?: number; reason?: string; start?: string; end?: string; mediaType?: "website" | "mobile" | "magazine" | "email"; pageType?: string }>({});
  const [blockStartDate, setBlockStartDate] = useState<Date | null>(null);
  const [blockEndDate, setBlockEndDate] = useState<Date | null>(null);

  // Load all slots for dropdown selection
  const { data: allSlots = [] } = useQuery<Slot[]>({ queryKey: ["/api/slots"] });
  const filteredSlots = (allSlots || []).filter((s) => {
    if (blockForm.mediaType && s.mediaType !== blockForm.mediaType) return false;
    if (blockForm.mediaType === "website" && blockForm.pageType && s.pageType !== blockForm.pageType) return false;
    return true;
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });



  // Work Orders (requests raised by clients)
  const { data: workOrdersData = [], isLoading: woLoading } = useQuery<{ workOrder: any; items: any[] }[]>({
    queryKey: ["/api/work-orders"],
  });

  const pendingWorkOrders = (workOrdersData || []).filter(w => w.workOrder.status === "draft");

  // Email/WhatsApp pricing section removed per requirements

  // Slot pricing editor removed per requirements

  const pendingBookings = bookings?.filter(b => b.status === "pending_manager") || [];
  const approvedBookings = bookings?.filter(b => 
    ["pending_vp", "pending_pv", "pending_payment", "pending_deployment", "approved", "active"].includes(b.status)
  ) || [];
  const rejectedBookings = bookings?.filter(b => b.status === "rejected") || [];
  const totalRevenue = bookings?.reduce((sum, b) => sum + parseFloat(b.totalAmount.toString()), 0) || 0;

  const form = useForm<z.infer<typeof slotFormSchema>>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: {
      mediaType: "website",
      pageType: "main",
      position: "header",
      dimensions: "728x90",
      pricing: 0,
      status: "available",
    },
  });

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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mediaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-media-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="mobile">Mobile App</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="magazine">Magazine</SelectItem>
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
                  name="pageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-page-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="main">Main</SelectItem>
                          <SelectItem value="course">Course</SelectItem>
                          <SelectItem value="webinar">Webinar</SelectItem>
                          <SelectItem value="student_login">Student Login</SelectItem>
                          <SelectItem value="student_home">Student Home</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., header, sidebar, footer" {...field} data-testid="input-position" />
                      </FormControl>
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
                          <Input placeholder="e.g., 728x90" {...field} data-testid="input-dimensions" />
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

      <Card>
        <CardHeader>
          <CardTitle>Pending Work Orders</CardTitle>
          <CardDescription>Requests raised by clients awaiting your quotation</CardDescription>
        </CardHeader>
        <CardContent>
          {woLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : pendingWorkOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending work orders</p>
          ) : (
            <div className="space-y-3">
          {pendingWorkOrders.map(({ workOrder, items }) => (
            <Card
              key={workOrder.id}
              className="hover-elevate cursor-pointer"
              onClick={() => navigate(`/work-orders/${workOrder.id}`)}
            >
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">WO #{workOrder.id}</span>
                        <Badge variant="secondary">Draft</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Items: {items.length}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total</div>
                      {Number(workOrder.totalAmount) > 0 || workOrder.status === 'quoted' ? (
                        <div className="font-semibold">₹{Number(workOrder.totalAmount).toLocaleString()}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Yet to be quoted</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing controls removed as requested */}

      <Card>
        <CardHeader>
          <CardTitle>Manual Slot Blocking</CardTitle>
          <CardDescription>Reserve or block slots for internal needs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Media Type</div>
              <Select value={blockForm.mediaType} onValueChange={(v) => {
                setBlockForm({ ...blockForm, mediaType: v as any, pageType: v === "website" ? (blockForm.pageType || "main") : undefined, slotId: undefined });
              }}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select media" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="mobile">Mobile App</SelectItem>
                  <SelectItem value="magazine">Magazine</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {blockForm.mediaType === "website" && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Page</div>
                <Select value={blockForm.pageType} onValueChange={(v) => setBlockForm({ ...blockForm, pageType: v, slotId: undefined })}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select page" />
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
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Slot</div>
              <Select
                value={blockForm.slotId ? String(blockForm.slotId) : undefined}
                onValueChange={(v) => setBlockForm({ ...blockForm, slotId: Number(v) })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSlots.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {`${s.mediaType === "website" ? "Website" : humanize(s.mediaType)}${
                        s.mediaType === "website" ? ` • ${humanize(s.pageType)}` : ""
                      } • ${humanize(s.position)}`} • {s.dimensions}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Start</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    readOnly
                    value={blockStartDate ? new Date(blockStartDate).toLocaleDateString() : ""}
                    placeholder="Select date"
                    className="h-8 cursor-pointer"
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
            <div>
              <div className="text-xs text-muted-foreground mb-1">End</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    readOnly
                    value={blockEndDate ? new Date(blockEndDate).toLocaleDateString() : ""}
                    placeholder="Select date"
                    className="h-8 cursor-pointer"
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
            <div className="md:col-span-6">
              <Input placeholder="Reason" value={blockForm.reason || ""} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={async () => {
              if (!blockForm.slotId) { toast({ title: "Slot ID required", variant: "destructive" }); return; }
              try {
                await fetch(`/api/slots/${blockForm.slotId}/unblock`, { method: "POST" }).then(r => r.ok ? r.json() : Promise.reject(r));
                toast({ title: "Unblocked", description: `Slot #${blockForm.slotId} is now available` });
              } catch {
                toast({ title: "Failed", description: "Could not unblock slot", variant: "destructive" });
              }
            }}>Unblock</Button>
            <Button onClick={async () => {
              if (!blockForm.slotId) { toast({ title: "Slot ID required", variant: "destructive" }); return; }
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
                toast({ title: "Blocked", description: `Slot #${blockForm.slotId} blocked` });
              } catch {
                toast({ title: "Failed", description: "Cannot block this slot because it overlaps with a client work order.", variant: "destructive" });
              }
            }}>Block Slot</Button>
          </div>
        </CardContent>
      </Card>

     
    </div>
  );
}
