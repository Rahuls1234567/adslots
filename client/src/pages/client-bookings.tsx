import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Search, FileText, Calendar, Package, ArrowRight, CheckCircle2, Clock, AlertCircle, MapPin, TrendingUp } from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "quoted", label: "Quoted" },
  { value: "client_accepted", label: "Client Accepted" },
  { value: "paid", label: "Paid" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "booked", label: "Booked" },
];

export default function ClientBookings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ workOrder: any; items: any[] }[]>({
    queryKey: ["/api/work-orders", { clientId: user?.id }],
    enabled: !!user?.id,
  });

  // Fetch bookings for the client
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings", { clientId: user?.id }],
    enabled: !!user?.id,
  });

  // Fetch slots to get slot details
  const { data: allSlots = [] } = useQuery<any[]>({
    queryKey: ["/api/slots"],
  });

  // Fetch release orders to get accurate status (ready_for_it, ready_for_material, etc.)
  const { data: releaseOrdersData = [], isLoading: releaseOrdersLoading } = useQuery<Array<{ releaseOrder: any; items: any[]; workOrder?: any }>>({
    queryKey: ["/api/release-orders"],
    enabled: !!user?.id,
  });

  // Fetch deployments to check deployment status
  const { data: deployments = [] } = useQuery<any[]>({
    queryKey: ["/api/deployments"],
    enabled: !!user?.id,
  });

  // Extract release orders from the API response structure
  const releaseOrders = useMemo(() => {
    return releaseOrdersData.map((entry) => entry.releaseOrder).filter(Boolean);
  }, [releaseOrdersData]);

  const filteredAndSorted = useMemo(() => {
    if (!data) return [];
    
    let filtered = data;
    
    // Filter by status
    if (statusFilter !== "all") {
      if (statusFilter === "booked") {
        // Filter for work orders that have bookings
        const workOrderIdsWithBookings = new Set(
          bookings.map((b) => b.customWorkOrderId).filter(Boolean)
        );
        filtered = filtered.filter(({ workOrder }) =>
          workOrderIdsWithBookings.has(workOrder.customWorkOrderId || `WO${workOrder.id}`)
        );
      } else {
        filtered = filtered.filter(({ workOrder }) => workOrder.status === statusFilter);
      }
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(({ workOrder, items }) => {
        const workOrderId = (workOrder.customWorkOrderId || `Work Order #${workOrder.id}`).toLowerCase();
        const status = String(workOrder.status).toLowerCase();
        const itemCount = String(items.length).toLowerCase();
        
        // Also search in slot information if bookings exist
        const workOrderBookings = bookings.filter(
          (b) => b.customWorkOrderId === workOrder.customWorkOrderId
        );
        const slotIds = workOrderBookings
          .map((b) => b.customSlotId)
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        
        return (
          workOrderId.includes(term) ||
          status.includes(term) ||
          itemCount.includes(term) ||
          slotIds.includes(term)
        );
      });
    }
    
    // Sort by creation date (newest first)
    return filtered.slice().sort((a, b) => 
      new Date(b.workOrder.createdAt).getTime() - new Date(a.workOrder.createdAt).getTime()
    );
  }, [data, statusFilter, searchTerm, bookings]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data) return { total: 0, paid: 0, draft: 0, active: 0, booked: 0 };
    const workOrderIdsWithBookings = new Set(
      bookings.map((b) => b.customWorkOrderId).filter(Boolean)
    );
    return {
      total: data.length,
      paid: data.filter(({ workOrder }) => workOrder.status === 'paid').length,
      draft: data.filter(({ workOrder }) => workOrder.status === 'draft').length,
      active: data.filter(({ workOrder }) => workOrder.status === 'active').length,
      booked: data.filter(({ workOrder }) =>
        workOrderIdsWithBookings.has(workOrder.customWorkOrderId || `WO${workOrder.id}`)
      ).length,
    };
  }, [data, bookings]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header Section */}
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
            <p className="text-muted-foreground text-base">
              Track the status of your requests and bookings
            </p>
          </div>

          {/* Statistics Cards */}
          {!isLoading && data && data.length > 0 && (
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                      <p className="text-2xl font-bold mt-1">{stats.total}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paid</p>
                      <p className="text-2xl font-bold mt-1 text-green-600">{stats.paid}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Draft</p>
                      <p className="text-2xl font-bold mt-1 text-orange-600">{stats.draft}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold mt-1 text-blue-600">{stats.active}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Booked</p>
                      <p className="text-2xl font-bold mt-1 text-purple-600">{stats.booked}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
          {/* Filters */}
          <Card className="shadow-lg border-2">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by work order ID, status, or items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 h-11"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-56 h-11">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {searchTerm || statusFilter !== "all" 
                        ? "No matching bookings" 
                        : "No bookings yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {searchTerm || statusFilter !== "all" 
                        ? "Try adjusting your search or filter criteria." 
                        : "Select slots (including Email/WhatsApp) and raise a request from the dashboard to get started."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAndSorted.map(({ workOrder, items }) => {
                const workOrderBookings = bookings.filter(
                  (b) => b.customWorkOrderId === workOrder.customWorkOrderId
                );
                // Match release orders by customWorkOrderId (release orders don't have workOrderId)
                const workOrderReleaseOrders = releaseOrders.filter(
                  (ro) => ro.customWorkOrderId === workOrder.customWorkOrderId
                );
                return (
                  <WorkOrderCard
                    key={workOrder.id}
                    workOrder={workOrder}
                    items={items}
                    bookings={workOrderBookings}
                    releaseOrders={workOrderReleaseOrders}
                    allSlots={allSlots}
                    workOrderItems={items}
                    deployments={deployments}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkOrderCard({
  workOrder,
  items,
  bookings = [],
  releaseOrders = [],
  allSlots = [],
  workOrderItems = [],
  deployments = [],
}: {
  workOrder: any;
  items: any[];
  bookings?: any[];
  releaseOrders?: any[];
  allSlots?: any[];
  workOrderItems?: any[];
  deployments?: any[];
}) {
  const [, navigate] = useLocation();
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: [`/api/invoices/work-order/${workOrder.id}`],
  });

  // Check if proforma invoice exists (uploaded by accounts)
  const proformaInvoice = invoices.find((inv) => inv.invoiceType === "proforma");
  const hasProformaInvoice = !!proformaInvoice;

  // Get slot details for bookings and match with release orders and deployments
  const bookingDetails = useMemo(() => {
    return bookings.map((booking) => {
      const slot = allSlots.find((s) => s.slotId === booking.customSlotId);
      // Find matching release order for this booking/work order
      // Match by customWorkOrderId (release orders only have customWorkOrderId, not workOrderId)
      const releaseOrder = releaseOrders.find((ro) => {
        return ro.customWorkOrderId && workOrder.customWorkOrderId && 
               ro.customWorkOrderId === workOrder.customWorkOrderId;
      });
      
      // Find matching work order item for this booking (by customSlotId and customWorkOrderId)
      const workOrderItem = workOrderItems.find((item) => {
        return item.customSlotId === booking.customSlotId &&
               item.customWorkOrderId === booking.customWorkOrderId;
      });
      
      // Find deployment for this work order item
      const deployment = workOrderItem 
        ? deployments.find((d: any) => d.workOrderItemId === workOrderItem.id)
        : null;
      
      // Determine the actual status - prefer deployment status over release order status
      let actualStatus = booking.status;
      let statusSource = "booking";
      
      // Check if deployed first (highest priority)
      if (deployment && deployment.status === "deployed") {
        // Check if campaign has expired
        const endDate = new Date(booking.endDate);
        const now = new Date();
        if (endDate < now) {
          actualStatus = "expired";
          statusSource = "deployment";
        } else {
          actualStatus = "deployed";
          statusSource = "deployment";
        }
      } else if (releaseOrder && releaseOrder.status) {
        // Use release order status which is more accurate (ready_for_it, ready_for_material, etc.)
        actualStatus = releaseOrder.status;
        statusSource = "release_order";
      }
      
      return {
        booking,
        slot,
        releaseOrder,
        workOrderItem,
        deployment,
        actualStatus,
        statusSource,
      };
    });
  }, [bookings, allSlots, releaseOrders, workOrder, workOrderItems, deployments]);

  // Get humanized booking/release order status
  const getBookingStatusBadge = (status: string) => {
    const statusStr = String(status).replace(/_/g, " ");
    switch (status) {
      // Release order statuses
      case "pending_manager_review":
      case "pending_vp_review":
      case "pending_pv_review":
        return {
          variant: "outline" as const,
          className:
            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300",
          icon: <Clock className="w-3 h-3" />,
        };
      case "pending_banner_upload":
        return {
          variant: "outline" as const,
          className:
            "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300",
          icon: <FileText className="w-3 h-3" />,
        };
      case "ready_for_it":
        return {
          variant: "default" as const,
          className:
            "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300",
          icon: <Package className="w-3 h-3" />,
        };
      case "ready_for_material":
        return {
          variant: "default" as const,
          className:
            "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300",
          icon: <Package className="w-3 h-3" />,
        };
      case "accepted":
        return {
          variant: "default" as const,
          className:
            "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-300",
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case "deployed":
        return {
          variant: "default" as const,
          className:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-300",
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case "expired":
        return {
          variant: "outline" as const,
          className:
            "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-300",
          icon: <Clock className="w-3 h-3" />,
        };
      // Booking statuses (fallback)
      case "pending_manager":
      case "pending_vp":
      case "pending_pv":
        return {
          variant: "outline" as const,
          className:
            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300",
          icon: <Clock className="w-3 h-3" />,
        };
      case "pending_payment":
        return {
          variant: "outline" as const,
          className:
            "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300",
          icon: <Clock className="w-3 h-3" />,
        };
      case "pending_deployment":
        return {
          variant: "outline" as const,
          className:
            "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300",
          icon: <Clock className="w-3 h-3" />,
        };
      case "approved":
      case "active":
        return {
          variant: "default" as const,
          className:
            "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-300",
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case "paused":
        return {
          variant: "outline" as const,
          className:
            "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-300",
          icon: <Clock className="w-3 h-3" />,
        };
      case "rejected":
        return {
          variant: "outline" as const,
          className:
            "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-300",
          icon: <AlertCircle className="w-3 h-3" />,
        };
      default:
        return {
          variant: "outline" as const,
          className: "",
          icon: <AlertCircle className="w-3 h-3" />,
        };
    }
  };

  // Get status badge variant and icon
  const getStatusBadge = (status: string) => {
    const statusStr = String(status).replace(/_/g, " ");
    switch (status) {
      case 'draft':
        return {
          variant: 'secondary' as const,
          className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
          icon: <Clock className="w-3 h-3" />
        };
      case 'paid':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
          icon: <CheckCircle2 className="w-3 h-3" />
        };
      case 'active':
        return {
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
          icon: <Package className="w-3 h-3" />
        };
      case 'completed':
        return {
          variant: 'default' as const,
          className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
          icon: <CheckCircle2 className="w-3 h-3" />
        };
      case 'quoted':
        return {
          variant: 'outline' as const,
          className: 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400',
          icon: <FileText className="w-3 h-3" />
        };
      case 'client_accepted':
        return {
          variant: 'outline' as const,
          className: 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400',
          icon: <CheckCircle2 className="w-3 h-3" />
        };
      default:
        return {
          variant: 'outline' as const,
          className: '',
          icon: <AlertCircle className="w-3 h-3" />
        };
    }
  };

  const statusBadge = getStatusBadge(workOrder.status);
  const workOrderId = workOrder.customWorkOrderId || `Work Order #${workOrder.id}`;
  const createdAt = new Date(workOrder.createdAt);

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20 group"
      onClick={() => navigate(`/work-orders/${workOrder.customWorkOrderId || workOrder.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">{workOrderId}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>
              {proformaInvoice && (
                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Invoice #{proformaInvoice.id} • ₹{Number(proformaInvoice.amount).toLocaleString()}</span>
                </div>
              )}
              {bookingDetails.length > 0 && (
                <div className="flex items-center gap-1.5 text-purple-600 font-medium">
                  <MapPin className="w-4 h-4" />
                  <span>{bookingDetails.length} slot{bookingDetails.length !== 1 ? "s" : ""} booked</span>
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant={statusBadge.variant}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold ${statusBadge.className}`}
          >
            {statusBadge.icon}
            <span className="capitalize">{String(workOrder.status).replace(/_/g, " ")}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Booking and Slot Information */}
        {bookingDetails.length > 0 && (
          <div className="border-t pt-4">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                Booked Slots ({bookingDetails.length})
              </div>
              <div className="space-y-2">
                {bookingDetails.map(({ booking, slot, actualStatus }, idx) => {
                  const bookingStatusBadge = getBookingStatusBadge(actualStatus);
                  const humanize = (value?: string | null) =>
                    value ? value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "—";
                  
                  return (
                    <div
                      key={booking.id || idx}
                      className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex-1 space-y-1">
                        {slot ? (
                          <div className="text-sm">
                            <span className="font-medium text-foreground">
                              {slot.slotId || `Slot #${slot.id}`}
                            </span>
                            <span className="text-muted-foreground"> • </span>
                            <span className="text-muted-foreground capitalize">
                              {humanize(slot.mediaType)}
                            </span>
                            {slot.pageType && slot.mediaType === "website" && (
                              <>
                                <span className="text-muted-foreground"> • </span>
                                <span className="text-muted-foreground">
                                  {PAGE_LABELS[slot.pageType] || humanize(slot.pageType)}
                                </span>
                              </>
                            )}
                            <span className="text-muted-foreground"> • </span>
                            <span className="text-muted-foreground">{humanize(slot.position)}</span>
                            <span className="text-muted-foreground"> • </span>
                            <span className="text-muted-foreground">{slot.dimensions}</span>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-foreground">
                            Slot ID: {booking.customSlotId || "N/A"}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span>
                            {new Date(booking.startDate).toLocaleDateString()} -{" "}
                            {new Date(booking.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={bookingStatusBadge.variant}
                        className={`flex items-center gap-1.5 px-2 py-1 text-xs ${bookingStatusBadge.className}`}
                      >
                        {bookingStatusBadge.icon}
                        <span className="capitalize">
                          {String(actualStatus).replace(/_/g, " ")}
                        </span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {invoicesLoading ? (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                Loading invoice information...
              </span>
            ) : workOrder.poApproved && !hasProformaInvoice ? (
              <span className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                PO approved. Proforma invoice will appear here once accounts uploads it.
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Click to view details
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

