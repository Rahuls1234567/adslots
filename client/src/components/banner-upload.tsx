import { useState, useCallback, useId } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileImage, X, History, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Banner } from "@shared/schema";

interface BannerUploadProps {
  bookingId: number;
  uploadedById: number;
}

export function BannerUpload({ bookingId, uploadedById }: BannerUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputId = useId();

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners", bookingId],
    queryFn: () => apiRequest(`/api/banners/${bookingId}`),
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/banners/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setSelectedFile(null);
      setPreview(null);
      setComments("");
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("bookingId", bookingId.toString());
    formData.append("uploadedById", uploadedById.toString());
    if (comments) formData.append("comments", comments);

    uploadMutation.mutate(formData);
  };

  const currentBanner = banners.find(b => b.isCurrent);
  const previousVersions = banners.filter(b => !b.isCurrent).sort((a, b) => b.version - a.version);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Banner</CardTitle>
            <CardDescription>
              Upload a new banner version (JPEG, PNG, GIF, or WebP, max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              data-testid="dropzone-upload"
            >
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg"
                    data-testid="img-preview"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <FileImage className="w-4 h-4" />
                    <span className="text-sm" data-testid="text-filename">{selectedFile?.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreview(null);
                      }}
                      data-testid="button-clear-file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Drop your banner here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleInputChange}
                    className="hidden"
                    id={fileInputId}
                    data-testid="input-file"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById(fileInputId)?.click()}
                    data-testid="button-browse"
                  >
                    Browse Files
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add notes about this version..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                data-testid="textarea-comments"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full"
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Banner"}
            </Button>
          </CardContent>
        </Card>

        {currentBanner && (
          <Card>
            <CardHeader>
              <CardTitle>Current Banner</CardTitle>
              <CardDescription>Version {currentBanner.version}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src={currentBanner.fileUrl}
                alt={`Version ${currentBanner.version}`}
                className="w-full rounded-lg"
                data-testid="img-current-banner"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(currentBanner.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uploaded</span>
                <span className="text-sm" data-testid="text-upload-date">
                  {new Date(currentBanner.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <CardTitle>Version History</CardTitle>
          </div>
          <CardDescription>
            {previousVersions.length} previous version{previousVersions.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : previousVersions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No previous versions
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {previousVersions.map((banner) => (
                  <Card key={banner.id} data-testid={`card-version-${banner.version}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Version {banner.version}</span>
                        {getStatusBadge(banner.status)}
                      </div>
                      <img
                        src={banner.fileUrl}
                        alt={`Version ${banner.version}`}
                        className="w-full rounded-lg"
                        data-testid={`img-version-${banner.version}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {new Date(banner.uploadedAt).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
