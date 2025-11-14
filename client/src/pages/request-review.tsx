import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Slot } from "@shared/schema";
import { CheckCircle2 } from "lucide-react";

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

  const dateRangeText = pending ? `${pending.startDate} → ${pending.endDate} (${durationDays} days)` : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Review Your Selection</h1>
        <p className="text-muted-foreground">Please confirm the details before raising the request.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Period</CardTitle>
          <CardDescription>From and to dates for these slots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium">{dateRangeText}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected Slots</CardTitle>
          <CardDescription>Section, place, name and dates</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedSlots.length === 0 ? (
            <div className="text-sm text-muted-foreground">No slots selected.</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {selectedSlots.map((s) => {
                const readablePage = s.mediaType === "website" ? (PAGE_LABELS[s.pageType] ?? s.pageType.replace(/_/g, " ")) : undefined;
                const section = s.mediaType === "website" ? `Website • ${readablePage}` : s.mediaType.charAt(0).toUpperCase() + s.mediaType.slice(1);
                const place = String(s.position).replace(/[-_]/g, " ");
                const name = s.dimensions;
                return (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-medium">{section}</div>
                      <div className="text-sm text-muted-foreground">Place: {place}</div>
                    <div className="text-sm text-muted-foreground">Dimensions: {name}</div>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">{pending?.startDate} → {pending?.endDate}</div>
                  </div>
                );
              })}
              {pending?.includeEmail && (
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-medium">Email</div>
                    <div className="text-sm text-muted-foreground">Place: –</div>
                    <div className="text-sm text-muted-foreground">Name: Email Campaign</div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">{pending?.startDate} → {pending?.endDate}</div>
                </div>
              )}
              {pending?.includeWhatsApp && (
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-medium">WhatsApp</div>
                    <div className="text-sm text-muted-foreground">Place: –</div>
                    <div className="text-sm text-muted-foreground">Name: WhatsApp Campaign</div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">{pending?.startDate} → {pending?.endDate}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => setLocation("/")}>Back</Button>
        <Button onClick={handleSubmit} disabled={submitted || selectedSlots.length === 0}>Raise a Request</Button>
      </div>

      {showSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 transition-all duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Request raised</span>
        </div>
      )}
    </div>
  );
}


