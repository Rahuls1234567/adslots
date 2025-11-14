import { useMemo, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ReleaseOrderDetailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loc] = useLocation();
  const idStr = useMemo(() => loc.split("/").pop() || "", [loc]);
  const releaseOrderId = Number(idStr);

  const { data, isLoading, refetch } = useQuery<{ releaseOrder: any; items: any[]; workOrder?: any; client?: any; createdBy?: any }>({
    queryKey: [`/api/release-orders/${releaseOrderId}`],
    enabled: Number.isFinite(releaseOrderId),
  });

  const [approving, setApproving] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [returning, setReturning] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [uploadInvoiceDialogOpen, setUploadInvoiceDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ro = data?.releaseOrder;
  const items = data?.items || [];
  const wo = (data as any)?.workOrder;
  const client = (data as any)?.client;
  const createdBy = (data as any)?.createdBy;

  const PAGE_LABELS: Record<string, string> = {
    main: "Landing page",
    student_home: "Student home page",
    student_login: "Login page",
    aimcat_results_analysis: "AIMCAT results and analysis page",
    chat_pages: "Chat pages",
  };

  const humanize = (s?: string) => (s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  const advanceReleaseOrder = async (successMessage: string, failureMessage: string) => {
    if (!Number.isFinite(releaseOrderId)) return;
    setApproving(true);
    try {
      await fetch(`/api/release-orders/${releaseOrderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: user?.id }),
      }).then(r => r.ok ? r.json() : Promise.reject(r));
      await refetch();
      toast({ title: successMessage });
    } catch (err: any) {
      toast({ title: 'Failed', description: failureMessage, variant: 'destructive' });
    } finally {
      setApproving(false);
    }
  };

  const returnReleaseOrder = async () => {
    if (!Number.isFinite(releaseOrderId) || !returnReason.trim()) return;
    setReturning(true);
    try {
      await fetch(`/api/release-orders/${releaseOrderId}/return-to-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user?.id, reason: returnReason }),
      }).then((r) => (r.ok ? r.json() : Promise.reject(r)));
      await refetch();
      toast({ title: "Sent back to client", description: "The client has been asked to revise and resubmit." });
      setReturnDialogOpen(false);
      setReturnReason("");
    } catch (err: any) {
      const description = typeof err?.text === "function" ? await err.text() : err?.message;
      toast({ title: "Failed", description: description || "Could not return release order", variant: "destructive" });
    } finally {
      setReturning(false);
    }
  };

  const uploadAccountsInvoice = async (file: File) => {
    if (!Number.isFinite(releaseOrderId)) return;
    
    // Validate file type (PDF only)
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10 MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `File size exceeds 10 MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        variant: "destructive",
      });
      return;
    }

    const form = new FormData();
    form.append('file', file);
    setUploadingInvoice(true);
    try {
      const res = await fetch(`/api/release-orders/${releaseOrderId}/accounts-invoice`, {
        method: 'POST',
        body: form,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Upload failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      await refetch();
      toast({ 
        title: 'Tax invoice uploaded successfully', 
        description: 'The tax invoice has been saved and is now available.' 
      });
      setUploadInvoiceDialogOpen(false);
    } catch (err: any) {
      toast({ 
        title: 'Upload failed', 
        description: err?.message || 'Please try again', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingInvoice(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ro ? `Release Order #${ro.id}` : 'Release Order'}</h1>
          {ro && (
            <p className="text-muted-foreground">WO #{ro.workOrderId} • {new Date(ro.issuedAt).toLocaleString()}</p>
          )}
        </div>
        {ro && (
          <Badge variant={ro.status === 'deployed' ? 'default' : 'secondary'}>
            {String(ro.status).replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : !ro ? (
        <p className="text-muted-foreground">Release Order not found.</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Release Summary</CardTitle>
              <CardDescription>Client and order details</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">B-School Name</div>
                <div className="font-medium">{wo?.businessSchoolName || client?.businessSchoolName || client?.name || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">PO</div>
                {wo?.poUrl ? (
                  <a className="underline" href={`/uploads/${wo.poUrl}`} target="_blank" rel="noreferrer">View PO</a>
                ) : (
                  <div>—</div>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="text-muted-foreground">Address</div>
                <div>{client?.schoolAddress || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Payment Type</div>
                <div>{wo?.paymentMode === 'full' ? 'Prepayment' : wo?.paymentMode === 'pay_later' ? 'Postpayment' : wo?.paymentMode === 'installment' ? 'Installments' : '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Stage</div>
                <div className="font-medium capitalize">{ro ? String(ro.status).replace(/_/g, ' ') : '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Payment Status</div>
                <div className={ro?.paymentStatus === 'completed' ? 'font-medium text-emerald-600' : 'font-medium text-orange-600'}>
                  {ro?.paymentStatus === 'completed' ? 'Paid' : 'Not Paid'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Created</div>
                <div>{new Date(ro.issuedAt).toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Created By</div>
                <div>{createdBy?.name || '—'}</div>
              </div>
              {ro.rejectionReason && (
                <div className="md:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="font-semibold">Latest rejection note</div>
                  <div className="mt-1 whitespace-pre-wrap">{ro.rejectionReason}</div>
                  {ro.rejectedAt && (
                    <div className="text-xs mt-2 text-destructive/80">
                      Updated {new Date(ro.rejectedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Slot details, period, and banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
            {items.filter((it: any) => !it.addonType).map((it: any) => {
              const section = it.slot
                ? (it.slot.mediaType === 'website'
                    ? `Website • ${PAGE_LABELS[it.slot.pageType] ?? humanize(it.slot.pageType)}`
                    : humanize(it.slot.mediaType))
                : `Slot #${it.slotId}`;
              const place = it.slot ? humanize(String(it.slot.position)) : (it.slotId ? `Slot ${it.slotId}` : "—");
              const name = it.slot?.dimensions || "—";
              return (
                <div key={it.id} className="flex items-center justify-between gap-3 border rounded-md p-3 text-sm">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-medium truncate">{section}</div>
                    <div className="text-muted-foreground">Place: {place}</div>
                    <div className="text-muted-foreground">Dimensions: {name}</div>
                    <div className="text-muted-foreground">{it.startDate} → {it.endDate}</div>
                    {ro?.rejectionReason && ro.status === 'pending_banner_upload' && it.bannerUrl && (
                      <div className="mt-2 text-xs text-destructive font-medium">
                        Banner rejected by manager
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {it.bannerUrl ? (
                      <a href={it.bannerUrl} target="_blank" rel="noreferrer" className="underline">View Banner</a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No banner</span>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="space-y-2 pt-2">
              {ro?.rejectionReason && ro.status === 'pending_banner_upload' && (user?.role === 'manager' || user?.role === 'admin' || user?.role === 'vp' || user?.role === 'pv_sir') && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive mb-3">
                  <div className="font-semibold">Banner Rejected by Manager</div>
                  <div className="mt-1 whitespace-pre-wrap">{ro.rejectionReason}</div>
                  {ro.rejectedAt && (
                    <div className="text-xs mt-2 text-destructive/80">
                      Rejected on {new Date(ro.rejectedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
              {(user?.role === 'manager' || user?.role === 'admin') && ro?.status === 'pending_manager_review' && (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setReturnDialogOpen(true);
                      setReturnReason(ro?.rejectionReason ?? "");
                    }}
                    disabled={returning}
                  >
                    Send back to Client
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => advanceReleaseOrder('Release Order sent to VP', 'Could not send Release Order to VP')}
                    disabled={approving}
                  >
                    {approving ? 'Approving…' : 'Approve and Send to VP'}
                  </Button>
                </div>
              )}

              {(user?.role === 'vp' || user?.role === 'admin') && ro?.status === 'pending_vp_review' && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => advanceReleaseOrder('Release Order sent to PV Sir', 'Could not send Release Order to PV Sir')}
                    disabled={approving}
                  >
                    {approving ? 'Approving…' : 'Approve and Send to PV Sir'}
                  </Button>
                </div>
              )}

              {(user?.role === 'pv_sir' || user?.role === 'admin') && ro?.status === 'pending_pv_review' && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => advanceReleaseOrder('Release Order accepted', 'Could not accept Release Order')}
                    disabled={approving}
                  >
                    {approving ? 'Approving…' : 'Approve Release Order'}
                  </Button>
                </div>
              )}

              {ro?.status && !['pending_manager_review', 'pending_vp_review', 'pending_pv_review'].includes(String(ro.status)) && (
                <div className="text-xs text-muted-foreground text-right">
                  Current stage: {String(ro.status).replace(/_/g, ' ')}
                </div>
              )}

              {ro?.status === 'accepted' && (
                <div className="rounded-md border p-3 text-xs text-emerald-600 bg-emerald-50">
                  Release Order accepted by all approvers.
                </div>
              )}

              {user?.role === 'client' && ro?.status === 'pending_banner_upload' && ro.rejectionReason && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  Release order was returned for updates: {ro.rejectionReason}
                  <br />
                  Please upload updated banners and resubmit.
                </div>
              )}
            </div>
            </CardContent>
          </Card>

          {user?.role === 'accounts' && ro?.status === 'accepted' && (
            <Card>
              <CardHeader>
                <CardTitle>Accounts Section</CardTitle>
                <CardDescription>Upload the final tax invoice for this release order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {ro.accountsInvoiceUrl ? (
                  <div className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium">Uploaded Tax Invoice</div>
                      <div className="text-xs text-muted-foreground break-all">{ro.accountsInvoiceUrl}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/uploads/${ro.accountsInvoiceUrl}`, "_blank", "noopener")}
                    >
                      View PDF
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No tax invoice uploaded yet. Please upload the final tax invoice for bookkeeping.
                  </div>
                )}

                <Button 
                  size="sm" 
                  disabled={uploadingInvoice}
                  type="button"
                  onClick={() => {
                    setUploadInvoiceDialogOpen(true);
                  }}
                >
                  {ro.accountsInvoiceUrl ? "Replace Tax Invoice" : "Upload Tax Invoice"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={returnDialogOpen} onOpenChange={(open) => { setReturnDialogOpen(open); if (!open) { setReturnReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return Release Order to Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Provide a clear reason so the client knows what to fix before resubmitting.
            </p>
            <Textarea
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              placeholder="Reason for returning to client"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setReturnDialogOpen(false); setReturnReason(""); }} disabled={returning}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={returnReleaseOrder}
                disabled={returning || !returnReason.trim()}
              >
                {returning ? "Sending…" : "Send to Client"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Tax Invoice Dialog */}
      <Dialog open={uploadInvoiceDialogOpen} onOpenChange={setUploadInvoiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Tax Invoice</DialogTitle>
            <DialogDescription>
              Upload the tax invoice for Release Order #{ro?.id}
            </DialogDescription>
          </DialogHeader>
          {ro && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground">Release Order:</span>{" "}
                  <span className="font-medium">RO #{ro.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Work Order:</span>{" "}
                  <span className="font-medium">WO #{ro.workOrderId}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select PDF File</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    id="accounts-invoice-upload-dialog"
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadAccountsInvoice(file);
                        // Reset input so same file can be selected again
                        e.target.value = "";
                      }
                    }}
                    disabled={uploadingInvoice}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingInvoice}
                    className="w-full"
                  >
                    Choose file
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only PDF files are allowed. Maximum file size: 10 MB
                </p>
                {uploadingInvoice && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800"></div>
                      <span>Uploading tax invoice...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadInvoiceDialogOpen(false);
                    setUploadingInvoice(false);
                  }}
                  disabled={uploadingInvoice}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


