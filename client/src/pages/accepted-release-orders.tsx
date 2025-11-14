import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, FileText, Eye, X } from "lucide-react";

export default function AcceptedReleaseOrdersPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedReleaseOrder, setSelectedReleaseOrder] = useState<any | null>(null);

  const { data = [], isLoading } = useQuery<Array<{ releaseOrder: any; items: any[] }>>({
    queryKey: ["/api/release-orders", { status: "accepted" }],
  });

  const uploadTaxInvoiceMutation = useMutation({
    mutationFn: async ({ releaseOrderId, file }: { releaseOrderId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/release-orders/${releaseOrderId}/accounts-invoice`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/release-orders", { status: "accepted" }] });
      toast({
        title: "Success",
        description: "Tax invoice uploaded successfully",
      });
      setUploadDialogOpen(false);
      setSelectedReleaseOrder(null);
      setUploadingInvoiceId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload tax invoice",
        variant: "destructive",
      });
      setUploadingInvoiceId(null);
    },
  });

  const handleUploadClick = (e: React.MouseEvent, releaseOrder: any) => {
    e.stopPropagation();
    setSelectedReleaseOrder(releaseOrder);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    if (selectedReleaseOrder) {
      setUploadingInvoiceId(selectedReleaseOrder.id);
      uploadTaxInvoiceMutation.mutate({
        releaseOrderId: selectedReleaseOrder.id,
        file,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Accepted Release Orders</h1>
        <p className="text-muted-foreground">Fully approved release orders ready for deployment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accepted R.O.</CardTitle>
          <CardDescription>Release orders approved by Manager, VP Sir, and PV Sir.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No accepted release orders yet.</p>
          ) : (
            <div className="space-y-2">
              {data.map(({ releaseOrder, items }) => (
                <Card
                  key={releaseOrder.id}
                  className="hover:shadow-sm transition cursor-pointer"
                  onClick={() => navigate(`/release-orders/${releaseOrder.id}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>RO #{releaseOrder.id} • WO #{releaseOrder.workOrderId}</CardTitle>
                      <CardDescription>
                        {new Date(releaseOrder.issuedAt).toLocaleString()} • {items.length} item{items.length === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Accepted</Badge>
                      <Badge variant={releaseOrder.paymentStatus === 'completed' ? 'default' : 'outline'}>
                        {releaseOrder.paymentStatus === 'completed' ? 'Paid' : 'Not Paid'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Click to view slot details and download banners.</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          Tax Invoice: {releaseOrder.accountsInvoiceUrl ? (
                            <span className="text-green-600 font-medium flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Uploaded
                            </span>
                          ) : (
                            <span className="text-orange-600 font-medium">Pending</span>
                          )}
                        </div>
                        {(user?.role === "accounts" || user?.role === "admin") && (
                          <Button
                            variant={releaseOrder.accountsInvoiceUrl ? "outline" : "default"}
                            size="sm"
                            onClick={(e) => handleUploadClick(e, releaseOrder)}
                            disabled={uploadingInvoiceId === releaseOrder.id}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {releaseOrder.accountsInvoiceUrl ? "Replace" : "Upload"} Tax Invoice
                          </Button>
                        )}
                        {releaseOrder.accountsInvoiceUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/uploads/${releaseOrder.accountsInvoiceUrl}`, "_blank", "noopener");
                            }}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Tax Invoice Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Tax Invoice</DialogTitle>
            <DialogDescription>
              Upload the tax invoice for Release Order #{selectedReleaseOrder?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedReleaseOrder && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Release Order:</span>{" "}
                  <span className="font-medium">RO #{selectedReleaseOrder.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Work Order:</span>{" "}
                  <span className="font-medium">WO #{selectedReleaseOrder.workOrderId}</span>
                </div>
                {selectedReleaseOrder.accountsInvoiceUrl && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <div className="font-semibold">Current Invoice</div>
                    <div className="mt-1">{selectedReleaseOrder.accountsInvoiceUrl}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-2"
                      onClick={() => window.open(`/uploads/${selectedReleaseOrder.accountsInvoiceUrl}`, "_blank", "noopener")}
                    >
                      <Eye className="h-4 w-4" />
                      View Current Invoice
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select PDF File</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  disabled={uploadingInvoiceId === selectedReleaseOrder.id}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                <p className="text-xs text-muted-foreground">
                  Only PDF files are allowed. Maximum file size: 10 MB
                </p>
              </div>

              {uploadingInvoiceId === selectedReleaseOrder.id && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800"></div>
                    <span>Uploading tax invoice...</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setSelectedReleaseOrder(null);
                    setUploadingInvoiceId(null);
                  }}
                  disabled={uploadingInvoiceId === selectedReleaseOrder.id}
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


