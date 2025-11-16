import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Slot } from "@shared/schema";
import { 
  CheckCircle2, 
  Calendar, 
  Package, 
  Mail, 
  MessageSquare, 
  Globe, 
  Monitor, 
  BookOpen, 
  ArrowRight,
  MapPin,
  Ruler,
  Send,
  ArrowLeft
} from "lucide-react";

type PendingSelection = {
  slotIds: number[];
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  includeEmail: boolean;
  includeWhatsApp: boolean;
};

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

export default function RequestReviewPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Read selection from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pendingRequestSelection");
      if (raw) {
        const parsed = JSON.parse(raw) as PendingSelection;
        setPending(parsed);
      }
    } catch {}
    setInitialized(true);
  }, []);

  const { data: slots } = useQuery<Slot[]>({ queryKey: ["/api/slots"], enabled: !!pending });

  const selectedSlots = useMemo(() => {
    if (!pending || !slots) return [] as Slot[];
    const setIds = new Set(pending.slotIds);
    return slots.filter((s) => setIds.has(s.id));
  }, [pending, slots]);

  if (!user) return <Redirect to="/login" />;
  if (initialized && !pending) return <Redirect to="/" />;

  const handleSubmit = async () => {
    if (!user || !pending) return;
    try {
      const items = pending.slotIds.map((id) => ({
        slotId: id,
        startDate: pending.startDate,
        endDate: pending.endDate,
      }));

      await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: user.id,
          items,
          includeEmail: pending.includeEmail,
          includeWhatsApp: pending.includeWhatsApp,
          rangeStart: pending.startDate,
          rangeEnd: pending.endDate,
        }),
      }).then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(new Error(e.error || "Request failed")))));

      setSubmitted(true);
      setShowSuccess(true);
      toast({ title: "Request raised", description: "Manager will review your request shortly." });
      setTimeout(() => {
        localStorage.removeItem("pendingRequestSelection");
        setLocation("/");
      }, 1200);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to raise request", variant: "destructive" });
    }
  };

  const durationDays = useMemo(() => {
    if (!pending) return 0;
    const a = new Date(pending.startDate);
    const b = new Date(pending.endDate);
    return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  }, [pending]);

  const startDateFormatted = pending ? new Date(pending.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "";
  const endDateFormatted = pending ? new Date(pending.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "";

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case "website":
        return <Globe className="w-4 h-4" />;
      case "mobile":
        return <Monitor className="w-4 h-4" />;
      case "magazine":
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const totalItems = selectedSlots.length + (pending?.includeEmail ? 1 : 0) + (pending?.includeWhatsApp ? 1 : 0);

  if (!slots && pending) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 md:p-8">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header Section */}
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 md:p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              Review Your Selection
            </h1>
            <p className="text-muted-foreground text-base">
              Please confirm all details before submitting your booking request
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 md:p-8">
          {/* Campaign Period Card */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-background dark:from-blue-950/10 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Campaign Period</CardTitle>
                  <CardDescription>Campaign duration for all selected slots</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {pending ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border-2 border-dashed bg-muted/50">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Start Date</div>
                      <div className="text-xl font-bold text-foreground">{startDateFormatted}</div>
                      <div className="text-xs text-muted-foreground mt-1">{pending.startDate}</div>
                    </div>
                    <div className="p-4 rounded-lg border-2 border-dashed bg-muted/50">
                      <div className="text-sm font-medium text-muted-foreground mb-1">End Date</div>
                      <div className="text-xl font-bold text-foreground">{endDateFormatted}</div>
                      <div className="text-xs text-muted-foreground mt-1">{pending.endDate}</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Total Duration</div>
                      <div className="text-2xl font-bold text-primary">{durationDays} {durationDays === 1 ? 'Day' : 'Days'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No date range selected</div>
              )}
            </CardContent>
          </Card>

          {/* Selected Slots Card */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50/50 to-background dark:from-purple-950/10 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Selected Items</CardTitle>
                    <CardDescription>
                      {totalItems === 0 
                        ? "No items selected" 
                        : `${totalItems} ${totalItems === 1 ? 'item' : 'items'} selected for booking`}
                    </CardDescription>
                  </div>
                </div>
                {totalItems > 0 && (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedSlots.length === 0 && !pending?.includeEmail && !pending?.includeWhatsApp ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-semibold text-foreground mb-1">No items selected</div>
                  <div className="text-sm text-muted-foreground">Please go back and select slots to book</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedSlots.map((s, idx) => {
                    const readablePage = s.mediaType === "website" ? (PAGE_LABELS[s.pageType] ?? s.pageType.replace(/_/g, " ")) : undefined;
                    const mediaTypeLabel = s.mediaType === "website" ? "Website" : s.mediaType.charAt(0).toUpperCase() + s.mediaType.slice(1);
                    const positionLabel = String(s.position).replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
                    
                    return (
                      <div 
                        key={s.id} 
                        className="p-5 rounded-lg border-2 bg-card hover:border-primary/30 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                {getMediaIcon(s.mediaType)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-lg text-foreground">{mediaTypeLabel}</span>
                                  {readablePage && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <Badge variant="outline" className="text-xs">
                                        {readablePage}
                                      </Badge>
                                    </>
                                  )}
                                  {s.slotId && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <Badge variant="secondary" className="text-xs font-mono">
                                        {s.slotId}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-13">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Position:</span>
                                <span className="font-medium text-foreground">{positionLabel}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Ruler className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Dimensions:</span>
                                <span className="font-medium text-foreground font-mono">{s.dimensions}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Dates</div>
                            <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                              {pending?.startDate}
                            </div>
                            <ArrowRight className="w-3 h-3 mx-auto text-muted-foreground" />
                            <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                              {pending?.endDate}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {pending?.includeEmail && (
                    <div className="p-5 rounded-lg border-2 bg-card hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              <Mail className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-lg text-foreground">Email Campaign</span>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                                  Addon Service
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-13">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Position:</span>
                              <span className="font-medium text-foreground">Email Newsletter</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Ruler className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium text-foreground">Email Campaign</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Dates</div>
                          <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {pending?.startDate}
                          </div>
                          <ArrowRight className="w-3 h-3 mx-auto text-muted-foreground" />
                          <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {pending?.endDate}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {pending?.includeWhatsApp && (
                    <div className="p-5 rounded-lg border-2 bg-card hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-lg text-foreground">WhatsApp Campaign</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                                  Addon Service
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-13">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Position:</span>
                              <span className="font-medium text-foreground">WhatsApp Message</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Ruler className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium text-foreground">WhatsApp Campaign</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Dates</div>
                          <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {pending?.startDate}
                          </div>
                          <ArrowRight className="w-3 h-3 mx-auto text-muted-foreground" />
                          <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {pending?.endDate}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              className="gap-2"
              disabled={submitted}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitted || totalItems === 0}
              className="gap-2 min-w-40"
              size="lg"
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Raise Request
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-3 transition-all duration-300 z-50 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Request submitted successfully!</span>
        </div>
      )}
    </div>
  );
}


