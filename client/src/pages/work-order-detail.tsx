import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type WorkOrder = {
  id: number;
  clientId: number;
  businessSchoolName?: string | null;
  contactName?: string | null;
  status: string;
  totalAmount: string;
  createdAt: string;
  poUrl?: string | null;
  poApproved?: boolean | null;
  poApprovedAt?: string | null;
  paymentMode?: string | null;
  gstPercent?: string | null;
  createdByName?: string | null;
  createdOnDate?: string | null;
  createdOnTime?: string | null;
  proformaUrl?: string | null;
  proformaInvoiceId?: number | null;
  negotiationRequested?: boolean | null;
  negotiationReason?: string | null;
  negotiationRequestedAt?: string | null;
};

export default function WorkOrderDetailPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loc] = useLocation();
  const idStr = useMemo(() => loc.split("/").pop() || "", [loc]);
  const workOrderId = Number(idStr);
  const [poUploadedUrl, setPoUploadedUrl] = useState<string | null>(null);
  const [showPoDialog, setShowPoDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [queuedPoFileName, setQueuedPoFileName] = useState<string | null>(null);
  const [queuedPoFile, setQueuedPoFile] = useState<File | null>(null);
  const [paymentMode, setPaymentMode] = useState<string | undefined>(undefined);
  const [gstPercent, setGstPercent] = useState<string>("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [negotiationReason, setNegotiationReason] = useState("");
  const [itemPrices, setItemPrices] = useState<Record<number, string>>({});
  const [pendingBannerPreviews, setPendingBannerPreviews] = useState<Record<number, string>>({});
  const [pendingBannerFiles, setPendingBannerFiles] = useState<Record<number, File>>({});
  const [viewBannerDialog, setViewBannerDialog] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });

  const uploadPo = async (file: File) => {
    // Validate file size (10 MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      toast({ 
        title: 'File too large', 
        description: `File size exceeds 10 MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`, 
        variant: 'destructive' 
      });
      return;
    }

    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/upload-po`, { method: 'POST', body: form });
      if (!res.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const out = await res.json();
      setPoUploadedUrl(out.poUrl || null);
      setQueuedPoFileName(null);
      setQueuedPoFile(null);
      toast({ title: 'PO uploaded', description: 'Your PO has been uploaded successfully.' });
      setShowPoDialog(false);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Please try again', variant: 'destructive' });
    }
  };

  const { data, isLoading, refetch } = useQuery<{ workOrder: WorkOrder; items: any[]; releaseOrderId?: number | null; releaseOrderStatus?: string | null }>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: Number.isFinite(workOrderId),
  });

  const {
    data: invoiceList = [],
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useQuery<any[]>({
    queryKey: [`/api/invoices/work-order/${workOrderId}`],
    enabled: Number.isFinite(workOrderId),
  });

  const items = data?.items || [];
  const wo = data?.workOrder as (WorkOrder | undefined);
  const releaseOrderId = (data as any)?.releaseOrderId || null;
  const releaseOrderStatus = (data as any)?.releaseOrderStatus || null;

  // Select the most recent proforma invoice (by generatedAt date)
  const proformaInvoice = useMemo(() => {
    const proformas = (invoiceList || []).filter((inv) => inv.invoiceType === "proforma");
    if (proformas.length === 0) return undefined;
    // Sort by generatedAt descending to get the most recent one
    return proformas.sort((a, b) => {
      const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    })[0];
  }, [invoiceList]);

  // Initialize payment mode from server data
  useEffect(() => {
    if (data?.workOrder?.paymentMode && !paymentMode) {
      setPaymentMode(data.workOrder.paymentMode);
    }
    if ((data?.workOrder as any)?.gstPercent != null && gstPercent === "") {
      setGstPercent(String((data?.workOrder as any)?.gstPercent ?? "0"));
    }
  }, [data?.workOrder?.paymentMode, data?.workOrder, paymentMode, gstPercent]);

  // Initialize item prices from server data
  useEffect(() => {
    if (data?.items && Object.keys(itemPrices).length === 0) {
      const initialPrices: Record<number, string> = {};
      data.items.forEach((it: any) => {
        initialPrices[it.id] = Number(it.unitPrice || 0).toString();
      });
      setItemPrices(initialPrices);
    }
  }, [data?.items]);

  const updateItem = useMutation({
    mutationFn: async ({ itemId, unitPrice }: { itemId: number; unitPrice: number }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitPrice }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await refetch();
      toast({ title: "Saved", description: "Item price updated." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message || "Try again", variant: "destructive" }),
  });

  const quote = useMutation({
    mutationFn: async () => {
      if (!paymentMode) {
        throw new Error("Please select a payment type before quoting");
      }
      const gst = Number(gstPercent);
      if (isNaN(gst) || gst < 0) {
        throw new Error("Please enter a valid GST percentage (0 or more)");
      }
      const updates = (data?.items || []).map((it: any) => {
        const price = itemPrices[it.id] !== undefined 
          ? Number(itemPrices[it.id] || 0)
          : Number(it.unitPrice || 0);
        if (isNaN(price) || price < 0) return null;
        return { itemId: it.id, unitPrice: price } as { itemId: number; unitPrice: number };
      }).filter(Boolean) as { itemId: number; unitPrice: number }[];

      if (updates.length > 0) {
        await Promise.all(
          updates.map(async (u) => {
            const r = await fetch(`/api/work-orders/${workOrderId}/items/${u.itemId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ unitPrice: u.unitPrice }),
            });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
          })
        );
      }

      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "quoted", paymentMode, gstPercent: gst, quotedById: user?.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await refetch();
      toast({ title: "Quote sent", description: "Client will see the updated quote." });
    },
    onError: (e: any) => toast({ title: "Failed to send quote", description: e?.message || "Try again", variant: "destructive" }),
  });

  const negotiate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/work-orders/${workOrderId}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: negotiationReason }),
      });
      if (!res.ok) {
        let message = "Request failed";
        try {
          const data = await res.json();
          message = data?.error || message;
        } catch {
          message = await res.text();
        }
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: async () => {
      await refetch();
      toast({ title: "Negotiation requested", description: "Manager has been notified." });
      setNegotiationReason("");
      setNegotiateOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Failed", description: e?.message || "Could not send negotiation request", variant: "destructive" });
    },
  });

  const acceptQuote = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/work-orders/${workOrderId}/accept`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await refetch();
      toast({ title: "Quote accepted", description: "Awaiting manager approval of your PO. Release Order will follow." });
    },
    onError: (e: any) => toast({ title: "Failed to accept", description: e?.message || "Try again", variant: "destructive" }),
  });

  const payInvoice = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([refetch(), refetchInvoices()]);
      toast({ title: "Payment successful", description: "Payment recorded successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Payment failed", description: err?.message || "Please try again", variant: "destructive" });
    },
  });

  const rejectWo = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reason: rejectReason, actorId: user?.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await refetch();
      setRejectOpen(false);
      setRejectReason("");
      toast({ title: "Work Order rejected", description: "The client has been notified." });
    },
    onError: (e: any) => toast({ title: "Failed to reject", description: e?.message || "Try again", variant: "destructive" }),
  });

  const proformaReady = Boolean(proformaInvoice);

  // Fetch release order to check payment status
  const { data: releaseOrderData } = useQuery<{ releaseOrder: any; items: any[]; workOrder?: any; client?: any }>({
    queryKey: releaseOrderId ? [`/api/release-orders/${releaseOrderId}`] : [],
    enabled: Number.isFinite(releaseOrderId || NaN),
  });

  const releaseOrder = releaseOrderData?.releaseOrder;

  // Check if payment is completed
  const paymentCompleted = proformaInvoice?.status === 'completed' || releaseOrder?.paymentStatus === 'completed';
  
  // Check if all banners are uploaded or have pending previews (excluding addons)
  const allBannersUploaded = items.filter((it: any) => !it.addonType).every((it: any) => it.bannerUrl || pendingBannerPreviews[it.id]);
  
  // Check if banners have been submitted to manager
  // Banners are considered submitted if release order status is beyond "pending_banner_upload"
  const bannersSubmitted = releaseOrder && 
    releaseOrder.status !== 'pending_banner_upload' && 
    releaseOrder.status !== null && 
    releaseOrder.status !== undefined;
  
  // Check if banners were rejected by manager
  // If rejected, status will be "pending_banner_upload" with rejectionReason
  const bannersRejected = releaseOrder?.status === 'pending_banner_upload' && !!releaseOrder?.rejectionReason;
  
  // When banners are rejected, check if new banners have been uploaded
  // New banners are indicated by pending banner files/previews
  const slotItems = items.filter((it: any) => !it.addonType);
  const hasNewBannerUploads = slotItems.some((it: any) => pendingBannerPreviews[it.id] || pendingBannerFiles[it.id]);
  
  // When rejected, ALL slots must have new banners uploaded (pending files/previews)
  // This ensures client actually uploaded new banners after rejection
  const allNewBannersUploaded = bannersRejected 
    ? slotItems.length > 0 && slotItems.every((it: any) => pendingBannerPreviews[it.id] || pendingBannerFiles[it.id])
    : true;
  
  // Button should be enabled when:
  // 1. Payment completed AND all banners uploaded
  // 2. Banners NOT already submitted
  // 3. If rejected, new banners must be uploaded for ALL slots
  const canSubmit = paymentCompleted && 
    allBannersUploaded && 
    !bannersSubmitted && 
    (bannersRejected ? allNewBannersUploaded : true);

  const PAGE_LABELS: Record<string, string> = {
    main: "Landing page",
    student_home: "Student home page",
    student_login: "Login page",
    aimcat_results_analysis: "AIMCAT results and analysis page",
    chat_pages: "Chat pages",
  };
  const humanize = (s?: string) => (s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  // Calculate total automatically from item prices and GST
  const calcLocalTotal = useMemo(() => {
    const sum = (items || []).reduce((acc: number, it: any) => {
      const price = itemPrices[it.id] !== undefined 
        ? Number(itemPrices[it.id] || 0)
        : Number(it.unitPrice || 0);
      return acc + (isNaN(price) ? 0 : price);
    }, 0);
    const gst = Number(gstPercent || (wo as any)?.gstPercent || 0);
    const gstAmt = sum * (isNaN(gst) ? 0 : gst) / 100;
    return sum + gstAmt;
  }, [items, itemPrices, gstPercent, wo]);

  // Determine if buttons should be disabled
  // Disable when: quoted and no negotiation, or client_accepted/paid/active
  // Enable when: draft, or quoted with negotiation requested
  const buttonsDisabled = useMemo(() => {
    if (!wo) return false;
    const status = wo.status;
    // If client has accepted or later stages, always disable
    if (['client_accepted', 'paid', 'active'].includes(status)) {
      return true;
    }
    // If quoted and no negotiation, disable
    if (status === 'quoted' && !wo.negotiationRequested) {
      return true;
    }
    // Enable for draft, or quoted with negotiation
    return false;
  }, [wo]);

  const subtotalAmount = useMemo(
    () => items.reduce((sum: number, it: any) => sum + Number(it?.subtotal ?? it?.unitPrice ?? 0), 0),
    [items]
  );
  const gstPercentValue = (() => {
    const raw = Number((wo as any)?.gstPercent ?? 0);
    return isNaN(raw) ? 0 : raw;
  })();
  const gstAmount = subtotalAmount * gstPercentValue / 100;
  const totalDueAmount = subtotalAmount + gstAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{wo ? `${wo.businessSchoolName || "Client"}_Work Order` : "Work Order"}</h1>
          {wo && (
            <p className="text-muted-foreground">WO #{wo.id} • {new Date(wo.createdAt).toLocaleString()}</p>
          )}
        </div>
        {wo && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{wo.status.replace(/_/g, " ")}</Badge>
            {Number(wo.totalAmount) > 0 || wo.status === 'quoted' ? (
              <span className="font-semibold">₹{Number(wo.totalAmount).toLocaleString()}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Yet to be quoted</span>
            )}
            {wo.createdByName && (
              <span className="text-xs text-muted-foreground ml-2">Created by: {wo.createdByName}</span>
            )}
            {wo.createdOnDate && wo.createdOnTime && (
              <span className="text-xs text-muted-foreground ml-2">on {wo.createdOnDate} {wo.createdOnTime}</span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      ) : !wo ? (
        <p className="text-muted-foreground">Work Order not found.</p>
      ) : (
        <div className="grid md:grid-cols-[2fr_1fr] gap-6">
          {/* Left: Items list (read-only details) */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>All requested slots and channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((it: any) => {
                if (it.addonType) {
                  const addon = it.addonType === 'email' ? 'Email Campaign' : 'WhatsApp Campaign';
                  return (
                    <div key={it.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                      <div className="truncate">
                        <div className="font-medium truncate">{addon}</div>
                        <div className="text-muted-foreground">{it.startDate} → {it.endDate}</div>
                      </div>
                      <div className="text-right text-muted-foreground">
                        {((user?.role === 'manager' || user?.role === 'admin')
                          || (['quoted','client_accepted','paid','active'].includes(String(wo.status)) && Number(it.unitPrice) > 0))
                          ? `₹${Number(it.unitPrice).toLocaleString()}`
                          : 'Pending quote'}
                      </div>
                    </div>
                  );
                }

                const section = it.slot
                  ? (it.slot.mediaType === 'website'
                      ? `Website • ${PAGE_LABELS[it.slot.pageType] ?? humanize(it.slot.pageType)}`
                      : humanize(it.slot.mediaType))
                  : `Slot #${it.slotId}`;
                const place = it.slot ? humanize(String(it.slot.position)) : "—";
                const name = it.slot?.dimensions || "—";
                return (
                  <div key={it.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-medium truncate">{section}</div>
                      <div className="text-muted-foreground">Place: {place}</div>
                      <div className="text-muted-foreground">Dimensions: {name}</div>
                      <div className="text-muted-foreground">{it.startDate} → {it.endDate}</div>
                      {releaseOrder?.rejectionReason && releaseOrder.status === 'pending_banner_upload' && it.bannerUrl && (
                        <div className="mt-2 text-xs text-destructive font-medium">
                          Banner rejected by manager
                        </div>
                      )}
                      {it.bannerUrl && (
                        <div className="mt-2">
                          <a href={it.bannerUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">
                            View Banner
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-muted-foreground">
                      {((user?.role === 'manager' || user?.role === 'admin')
                        || (['quoted','client_accepted','paid','active'].includes(String(wo.status)) && Number(it.unitPrice) > 0))
                        ? `₹${Number(it.unitPrice).toLocaleString()}`
                        : 'Pending quote'}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Right: Actions panel (role-based) */}
          {user?.role === 'manager' || user?.role === 'admin' ? (
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Update item prices and send/update quote</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {wo?.negotiationRequested && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="font-semibold text-amber-900">Client requested negotiation</div>
                    <div className="mt-1 whitespace-pre-wrap">{wo.negotiationReason}</div>
                    {wo.negotiationRequestedAt && (
                      <div className="mt-2 text-[11px] uppercase tracking-wide text-amber-600">
                        Received {new Date(wo.negotiationRequestedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-sm font-medium">Payment Type</div>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Prepayment</SelectItem>
                      <SelectItem value="pay_later">Postpayment</SelectItem>
                      <SelectItem value="installment">Installments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">GST (%)</div>
                  <Input
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    placeholder="e.g., 18"
                    className="h-8 w-28"
                  />
                </div>
                {wo?.poUrl && (
                  <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div className="text-muted-foreground">PO</div>
                    <a className="underline" href={`/uploads/${wo.poUrl}`} target="_blank" rel="noreferrer">View PO</a>
                  </div>
                )}
                {items.map((it: any) => {
                  const label = it.addonType
                    ? (it.addonType === 'email' ? 'Email' : 'WhatsApp')
                    : (it.slot
                        ? (it.slot.mediaType === 'website'
                            ? `Website • ${PAGE_LABELS[it.slot.pageType] ?? humanize(it.slot.pageType)} • ${humanize(it.slot.position)}`
                            : `${humanize(it.slot.mediaType)} • ${humanize(it.slot.position)}`)
                        : `Slot #${it.slotId}`);
                  const currentPrice = itemPrices[it.id] !== undefined 
                    ? itemPrices[it.id] 
                    : Number(it.unitPrice || 0).toString();
                  return (
                    <div key={it.id} className="flex items-center justify-between gap-2">
                      <div className="text-sm truncate">{label}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`price-${it.id}`}
                          value={currentPrice}
                          onChange={(e) => {
                            const value = e.target.value;
                            setItemPrices(prev => ({ ...prev, [it.id]: value }));
                          }}
                          className="w-28 h-8"
                          type="number"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <div className="text-sm text-muted-foreground">Total (incl. GST)</div>
                  <div className="font-semibold">₹{calcLocalTotal.toLocaleString()}</div>
                </div>
                {wo?.poUrl && (
                  <div className="space-y-2">
                    {wo.poApproved ? (
                      <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-800 font-medium">✓ PO Approved</span>
                          {wo.poApprovedAt && (
                            <span className="text-xs text-green-600">
                              {new Date(wo.poApprovedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end -mt-1">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={async () => {
                            try {
                              await fetch(`/api/work-orders/${workOrderId}/approve-po`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ actorId: user?.id }),
                              }).then(r => r.ok ? r.json() : Promise.reject(r));
                              await refetch();
                              toast({ title: "PO approved", description: "Accounts notified to upload the proforma invoice." });
                            } catch {
                              toast({ title: "Failed", description: "Could not approve PO", variant: "destructive" });
                            }
                          }}
                        >
                          Approve PO
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => quote.mutate()} 
                    disabled={quote.isPending || buttonsDisabled}
                  >
                    {wo.status === 'quoted' ? 'Update Quote' : 'Send Quote'}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => setRejectOpen(true)}
                    disabled={buttonsDisabled}
                  >
                    Reject Work Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Manage this work order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {wo.negotiationRequested && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <div className="font-semibold text-amber-900">
                      Negotiation request sent
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">
                      {wo.negotiationReason}
                    </div>
                    {wo.negotiationRequestedAt && (
                      <div className="mt-2 text-[11px] uppercase tracking-wide text-amber-600">
                        Sent {new Date(wo.negotiationRequestedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
                {wo?.poUrl && (
                  <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div className="text-muted-foreground">PO</div>
                    <a className="underline" href={`/uploads/${wo.poUrl}`} target="_blank" rel="noreferrer">View PO</a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-sm capitalize">{wo.status.replace(/_/g, ' ')}</div>
                </div>
                {wo.paymentMode && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Payment Type</div>
                    <div className="text-sm">
                      {wo.paymentMode === 'full' ? 'Prepayment' : wo.paymentMode === 'pay_later' ? 'Postpayment' : 'Installments'}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Total</div>
                  {(['quoted','client_accepted','paid','active'].includes(String(wo.status))) && Number(wo.totalAmount) > 0 ? (
                    <div className="font-semibold">₹{Number(wo.totalAmount).toLocaleString()}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Pending quote</div>
                  )}
                </div>

                {invoicesLoading ? (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    Loading invoice details…
                  </div>
                ) : proformaInvoice ? (
                  <div className="space-y-2 border-t pt-3">
                    <div className="text-sm font-medium">Proforma Invoice</div>
                    <div className="space-y-2 rounded-md border p-3 bg-muted/40 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Invoice #</span>
                        <span>{proformaInvoice.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <span className={proformaInvoice.status === 'completed' ? 'text-emerald-600 font-medium' : 'text-orange-600 font-medium'}>
                          {proformaInvoice.status === 'completed' ? 'Paid' : 'Not Paid'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Invoice Amount</span>
                        <span>₹{Number(proformaInvoice.amount ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span>₹{subtotalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>GST ({gstPercentValue}%)</span>
                        <span>₹{gstAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total Due</span>
                        <span>₹{totalDueAmount.toLocaleString()}</span>
                      </div>
                      {proformaInvoice.dueDate && (
                        <div className="flex items-center justify-between">
                          <span>Due Date</span>
                          <span>{new Date(proformaInvoice.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/api/invoices/${proformaInvoice.id}/pdf`, "_blank", "noopener")}
                        >
                          Download PDF
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => payInvoice.mutate(proformaInvoice.id)}
                          disabled={proformaInvoice.status === 'completed' || payInvoice.isPending}
                        >
                          {proformaInvoice.status === 'completed'
                            ? 'Paid'
                            : payInvoice.isPending
                              ? 'Processing…'
                              : 'Pay Now'}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-md border p-3 text-xs text-muted-foreground bg-muted/20">
                      The amounts above include every slot and add-on in this work order. Download the invoice for a printable copy.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    Proforma invoice will appear here once the manager approves your PO.
                  </div>
                )}

                {wo.status === 'quoted' && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                          setNegotiationReason(wo.negotiationReason || "");
                          setNegotiateOpen(true);
                        }}
                      >
                        {wo.negotiationRequested ? "Update Negotiation" : "Negotiate"}
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => setShowPoDialog(true)}>
                        {(poUploadedUrl || wo?.poUrl) ? 'Re-upload PO' : 'Upload PO'}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (!(poUploadedUrl || wo?.poUrl)) {
                          toast({ title: 'Upload PO required', description: 'Please upload your Purchase Order, then accept the quotation.', variant: 'destructive' });
                          return;
                        }
                        acceptQuote.mutate();
                      }}
                      disabled={acceptQuote.isPending}
                    >
                      {acceptQuote.isPending ? 'Accepting…' : 'Accept Quote'}
                    </Button>
                  </>
                )}

              </CardContent>
            </Card>
          )}
        </div>
      )}
      {/* Upload PO dialog */}
      <Dialog open={showPoDialog} onOpenChange={setShowPoDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Upload Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/60'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setQueuedPoFileName(file.name);
                  setQueuedPoFile(file);
                }
              }}
            >
              <input
                id="po-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.html,.htm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                if (!file) return;
                setQueuedPoFileName(file.name);
                setQueuedPoFile(file);
                }}
              />
              <label htmlFor="po-file-input" className="cursor-pointer block select-none">
                <div className="text-sm font-medium">Drag & drop your PO here</div>
                <div className="inline-block mt-3 px-3 py-1.5 rounded-md border text-sm">Choose file</div>
              </label>
            </div>
            
            {/* Supported formats and file size info */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-medium text-foreground">Supported formats:</div>
              <div className="text-xs text-muted-foreground">
                JPG, PNG, GIF, HTML5, PDF
              </div>
              <div className="text-xs font-medium text-foreground mt-2">Maximum file size:</div>
              <div className="text-xs text-muted-foreground">
                10 MB
              </div>
            </div>

            {(queuedPoFileName || poUploadedUrl) && queuedPoFile && (
              <div className="rounded-md border p-3 space-y-1">
                <div className="text-xs font-medium text-foreground">Selected file:</div>
                <div className="text-xs text-muted-foreground">
                  {queuedPoFileName}
                </div>
                <div className="text-xs text-muted-foreground">
                  Size: {(queuedPoFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
                {queuedPoFile.size > 10 * 1024 * 1024 && (
                  <div className="text-xs text-red-600 font-medium mt-1">
                    File size exceeds 10 MB limit
                  </div>
                )}
              </div>
            )}
            
            {(queuedPoFileName || poUploadedUrl) && !queuedPoFile && (
              <div className="text-xs text-muted-foreground">
                {queuedPoFileName ? `Selected: ${queuedPoFileName}` : `Uploaded: ${poUploadedUrl}`}
              </div>
            )}
            {queuedPoFile && queuedPoFile.size <= 10 * 1024 * 1024 && (
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => uploadPo(queuedPoFile)}>
                  Upload
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={negotiateOpen}
        onOpenChange={(open) => {
          setNegotiateOpen(open);
          if (!open) setNegotiationReason("");
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {wo?.negotiationRequested ? "Update negotiation request" : "Request negotiation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={negotiationReason}
              onChange={(e) => setNegotiationReason(e.target.value)}
              placeholder="Describe what you would like to negotiate (pricing, timeline, slots, etc.)"
              rows={5}
            />
            <div className="text-xs text-muted-foreground">
              This message is visible to the manager handling your work order.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNegotiationReason(""); setNegotiateOpen(false); }}>
                Cancel
              </Button>
              <Button
                onClick={() => negotiate.mutate()}
                disabled={!negotiationReason.trim() || negotiate.isPending}
              >
                {negotiate.isPending ? "Sending…" : wo?.negotiationRequested ? "Update Request" : "Send Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject WO dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Reject Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Add an optional reason. The client will be notified.
            </div>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => rejectWo.mutate()} disabled={rejectWo.isPending}>
                {rejectWo.isPending ? "Rejecting…" : "Reject Work Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Banner Dialog */}
      <Dialog open={viewBannerDialog.open} onOpenChange={(open) => setViewBannerDialog({ open, url: null })}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>View Banner</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center max-h-[80vh] overflow-auto">
            {viewBannerDialog.url && (
              <img 
                src={viewBannerDialog.url} 
                alt="Banner" 
                className="max-w-full max-h-[80vh] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'text-center text-muted-foreground p-4';
                  errorDiv.textContent = 'Failed to load banner image';
                  e.currentTarget.parentElement?.appendChild(errorDiv);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {wo && user?.role === 'client' && (wo.status === 'client_accepted' || wo.status === 'paid') && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Banners</CardTitle>
            <CardDescription>Upload a banner for each slot, then submit to manager</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {releaseOrderStatus ? (
              <div className="text-xs text-muted-foreground">
                Current release order stage: <span className="font-medium text-foreground">{String(releaseOrderStatus).replace(/_/g, ' ')}</span>
              </div>
            ) : null}
            {releaseOrder?.rejectionReason && releaseOrder.status === 'pending_banner_upload' && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="font-semibold">Banner Rejected by Manager</div>
                <div className="mt-1 whitespace-pre-wrap">{releaseOrder.rejectionReason}</div>
                {releaseOrder.rejectedAt && (
                  <div className="text-xs mt-2 text-destructive/80">
                    Rejected on {new Date(releaseOrder.rejectedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
            {items.filter((it: any) => !it.addonType).map((it: any) => {
              const bannerPreview = pendingBannerPreviews[it.id];
              const hasBanner = it.bannerUrl || bannerPreview;
              
              return (
                <div key={it.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                  <div className="text-sm">
                    {it.slot ? `${it.slot.mediaType} • ${it.slot.pageType} • ${it.slot.position}` : `Slot #${it.slotId}`}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasBanner ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewBannerDialog({ open: true, url: bannerPreview || it.bannerUrl });
                        }}
                      >
                        View
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No banner</span>
                    )}
                    <label className="cursor-pointer">
                      <span className="inline-block px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition">
                        {hasBanner ? "Update" : "Choose File"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          
                          // Validate file size (below 500KB)
                          const maxSize = 500 * 1024; // 500KB
                          
                          if (f.size > maxSize) {
                            toast({ 
                              title: 'File too large', 
                              description: `Banner size must be below 500KB. Current size: ${(f.size / 1024).toFixed(2)}KB`, 
                              variant: 'destructive' 
                            });
                            return;
                          }
                          
                          // Create preview (don't upload yet) - stored for validation and later upload
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPendingBannerPreviews(prev => ({
                              ...prev,
                              [it.id]: reader.result as string
                            }));
                            setPendingBannerFiles(prev => ({
                              ...prev,
                              [it.id]: f
                            }));
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                    </label>
                    {bannerPreview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPendingBannerPreviews(prev => {
                            const newPrev = { ...prev };
                            delete newPrev[it.id];
                            return newPrev;
                          });
                          setPendingBannerFiles(prev => {
                            const newFiles = { ...prev };
                            delete newFiles[it.id];
                            return newFiles;
                          });
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col items-end gap-2">
              {!paymentCompleted ? (
                <div className="text-xs text-orange-600">
                  Payment must be completed before submitting banners
                </div>
              ) : !allBannersUploaded ? (
                <div className="text-xs text-orange-600">
                  Please upload banners for all slots before submitting
                </div>
              ) : bannersSubmitted && !bannersRejected ? (
                <div className="text-xs text-blue-600">
                  Banners submitted to manager - Awaiting review
                </div>
              ) : bannersRejected ? (
                <div className="text-xs text-red-600">
                  {allNewBannersUploaded 
                    ? "Banners rejected - New banners uploaded for all slots, ready to resubmit"
                    : "Banners rejected - Please upload new banners for all slots and resubmit"}
                </div>
              ) : (
                <div className="text-xs text-green-600">
                  Ready to submit banners to manager
                </div>
              )}
              <Button 
                size="sm" 
                disabled={!canSubmit}
                onClick={async () => {
                  // Double-check validation before submitting
                  if (!paymentCompleted) {
                    toast({ 
                      title: 'Payment Required', 
                      description: 'Please complete payment before submitting banners.', 
                      variant: 'destructive' 
                    });
                    return;
                  }
                  
                  if (!allBannersUploaded) {
                    const missingCount = items.filter((it: any) => !it.addonType && !it.bannerUrl && !pendingBannerPreviews[it.id]).length;
                    toast({ 
                      title: 'Banners Required', 
                      description: `Please upload banners for all ${missingCount} slot(s) before submitting.`, 
                      variant: 'destructive' 
                    });
                    return;
                  }
                  
                  // Prevent resubmission if already submitted (unless rejected)
                  if (bannersSubmitted && !bannersRejected) {
                    toast({ 
                      title: 'Already Submitted', 
                      description: 'Banners have already been submitted to manager. Awaiting review.', 
                      variant: 'default' 
                    });
                    return;
                  }
                  
                  // If rejected, ensure new banners are uploaded for all slots
                  if (bannersRejected && !allNewBannersUploaded) {
                    const missingCount = slotItems.filter((it: any) => !pendingBannerPreviews[it.id] && !pendingBannerFiles[it.id]).length;
                    toast({ 
                      title: 'New Banners Required', 
                      description: `Please upload new banners for all ${missingCount} slot(s) before resubmitting.`, 
                      variant: 'destructive' 
                    });
                    return;
                  }
                  
                  try {
                    // First, upload all pending banner files
                    const pendingItems = items.filter((it: any) => !it.addonType && pendingBannerFiles[it.id]);
                    for (const item of pendingItems) {
                      const file = pendingBannerFiles[item.id];
                      const fd = new FormData();
                      fd.append('file', file);
                      const res = await fetch(`/api/work-orders/${workOrderId}/items/${item.id}/upload-banner`, { method: 'POST', body: fd });
                      if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.error || 'Failed to upload banner');
                      }
                    }
                    
                    // Clear pending previews after successful uploads
                    setPendingBannerPreviews({});
                    setPendingBannerFiles({});
                    
                    // Then submit banners
                    const response = await fetch(`/api/work-orders/${workOrderId}/submit-banners`, { method: 'POST' });
                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || 'Failed to submit banners');
                    }
                    await response.json();
                    toast({ title: 'Submitted', description: 'Banners submitted to manager successfully.' });
                    await refetch();
                  } catch (err: any) {
                    toast({ 
                      title: 'Submission Failed', 
                      description: err?.message || 'Could not submit banners. Please try again.', 
                      variant: 'destructive' 
                    });
                  }
                }}
              >
                Submit to Manager
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Release Order card intentionally omitted here; use Release Orders tab instead */}
    </div>
  );
}


