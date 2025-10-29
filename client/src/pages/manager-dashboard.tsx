import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSlotSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, AlertCircle, TrendingUp, DollarSign, Plus, CheckCircle, XCircle } from "lucide-react";
import type { Booking, Slot } from "@shared/schema";

const slotFormSchema = insertSlotSchema.extend({
  pricing: z.coerce.number().positive("Price must be positive"),
});

export default function ManagerDashboard() {
  const [createSlotOpen, setCreateSlotOpen] = useState(false);
  const { toast } = useToast();

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });

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
      return await apiRequest("POST", "/api/slots", data);
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
                            <SelectItem value="booked">Booked</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
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
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-count">{pendingBookings.length}</div>
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
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Review and approve client advertising requests</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : pendingBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending approvals</p>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <Card key={booking.id} className="hover-elevate" data-testid={`card-booking-${booking.id}`}>
                  <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Booking #{booking.id}</span>
                        <Badge variant="secondary">Pending Review</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Slot ID: {booking.slotId} • {booking.startDate} - {booking.endDate}
                      </div>
                      <div className="font-medium mt-2">Amount: ₹{booking.totalAmount}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "rejected" })}
                        disabled={updateBookingStatusMutation.isPending}
                        data-testid={`button-reject-${booking.id}`}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: "pending_vp" })}
                        disabled={updateBookingStatusMutation.isPending}
                        data-testid={`button-approve-${booking.id}`}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approve & Send to VP
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>Complete list of advertising campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No bookings yet</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`row-booking-${booking.id}`}
                >
                  <div className="flex-1">
                    <span className="font-medium">Booking #{booking.id}</span>
                    <span className="text-sm text-muted-foreground ml-4">
                      {booking.startDate} - {booking.endDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={
                      booking.status === "active" ? "default" :
                      booking.status === "rejected" ? "destructive" :
                      "secondary"
                    }>
                      {booking.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-medium">₹{booking.totalAmount}</span>
                    <Button variant="ghost" size="sm" data-testid={`button-details-${booking.id}`}>
                      Details
                    </Button>
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
