import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/date-range-picker";
import { SlotGrid } from "@/components/slot-grid";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Slot } from "@shared/schema";
import { Monitor, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

export default function ManagerWorkOrderNewPage() {
  const { toast } = useToast();
  const [loc, setLocation] = useLocation();
  const { user } = useAuth();
  const clientId = useMemo(() => {
    try {
      const qs = new URLSearchParams(loc.split("?")[1] || "");
      return Number(qs.get("clientId"));
    } catch {
      return NaN;
    }
  }, [loc]);

  const { data: client } = useQuery<any>({
    queryKey: clientId ? [`/api/users/${clientId}`] : ["/api/users/disabled"],
    enabled: Number.isFinite(clientId) && clientId > 0,
  });

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<"website" | "mobile" | "magazine" | "email" | "whatsapp">("website");
  const [selectedPage, setSelectedPage] = useState<string>("main");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [selectedBySection, setSelectedBySection] = useState<Record<string, number>>({});
  const [includeEmail, setIncludeEmail] = useState(false);
  const [includeWhatsApp, setIncludeWhatsApp] = useState(false);

  const { data: availableSlots, isLoading } = useQuery<Slot[]>({
    queryKey: ["/api/slots/available", { 
      startDate: startDate?.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
      pageType: selectedMedia === "website" ? selectedPage : undefined,
      mediaType: selectedMedia,
    }],
    enabled: !!startDate && !!endDate,
  });

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const toggleSelectSlot = (slot: Slot) => {
    const sectionKey = slot.mediaType === "website" ? `website:${slot.pageType}` : slot.mediaType;
    setSelectedSlotIds((prev) => {
      const isAlreadySelected = prev.includes(slot.id);
      if (isAlreadySelected) {
        setSelectedBySection((map) => {
          const next = { ...map };
          if (next[sectionKey] === slot.id) delete next[sectionKey];
          return next;
        });
        return prev.filter((id) => id !== slot.id);
      }
      const existingInSection = selectedBySection[sectionKey];
      if (existingInSection && existingInSection !== slot.id) {
        toast({
          title: "One slot per section",
          description: "Only one slot within the same section can be selected.",
          variant: "destructive",
        });
        return prev;
      }
      setSelectedBySection((map) => ({ ...map, [sectionKey]: slot.id }));
      return [...prev, slot.id];
    });
  };

  const openInfo = (slot: Slot) => {
    setSelectedSlot(slot);
    setInfoOpen(true);
  };

  const filteredSlots = availableSlots?.filter(slot => slot.mediaType === selectedMedia) || [];

  const pageTypes = [
    { value: "main", label: "Landing page" },
    { value: "student_home", label: "Student home page" },
    { value: "student_login", label: "Login page" },
    { value: "aimcat_results_analysis", label: "AIMCAT results and analysis page" },
    { value: "chat_pages", label: "Chat pages" },
  ];

  return (
    <div className="flex h-full">
      <div className="w-80 border-r bg-muted/30 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New Work Order</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {client ? `For: ${client.name} (${client.businessSchoolName || "—"})` : "Select slots and channels"}
          </p>
        </div>
        <DateRangePicker startDate={startDate} endDate={endDate} onDateChange={handleDateChange} />
        {startDate && endDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Selected Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">
                    {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Slots Available:</span>
                  <span className="font-medium text-primary">
                    {filteredSlots.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex-1 p-8 space-y-6 overflow-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Select Slots</CardTitle>
                <CardDescription className="mt-1">Choose slots for the selected dates</CardDescription>
              </div>
              <Monitor className="w-6 h-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={selectedMedia} onValueChange={(v) => setSelectedMedia(v as any)}>
              <TabsList>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="mobile">Mobile App</TabsTrigger>
                <TabsTrigger value="magazine">Magazine</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              </TabsList>

              <TabsContent value="website" className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Page</span>
                  <Select value={selectedPage} onValueChange={setSelectedPage}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageTypes.map((page) => (
                        <SelectItem key={page.value} value={page.value}>
                          {page.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!startDate || !endDate ? (
                  <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">Please select start and end dates to view available slots</p>
                  </div>
                ) : isLoading ? (
                  <div className="grid grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">No slots available for the selected page and dates</p>
                  </div>
                ) : (
                  <div className="bg-card rounded-lg border p-6">
                    <SlotGrid
                      slots={filteredSlots}
                      selectedSlots={selectedSlotIds}
                      onSlotSelect={toggleSelectSlot}
                      onSlotInfo={openInfo}
                      selectable
                      mediaType="website"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="mobile">
                {!startDate || !endDate ? (
                  <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">Please select dates to view mobile slots</p>
                  </div>
                ) : isLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full" />
                    ))}
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">No mobile slots available for the selected dates</p>
                  </div>
                ) : (
                  <div className="bg-card rounded-lg border p-6">
                    <SlotGrid
                      slots={filteredSlots}
                      selectedSlots={selectedSlotIds}
                      onSlotSelect={toggleSelectSlot}
                      onSlotInfo={openInfo}
                      selectable
                      mediaType="mobile"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="magazine">
                {!startDate || !endDate ? (
                  <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">Please select dates to view magazine slots</p>
                  </div>
                ) : isLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-40 w-full" />
                    ))}
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">No magazine slots available</p>
                  </div>
                ) : (
                  <div className="bg-card rounded-lg border p-6">
                    <SlotGrid
                      slots={filteredSlots}
                      selectedSlots={selectedSlotIds}
                      onSlotSelect={toggleSelectSlot}
                      onSlotInfo={openInfo}
                      selectable
                      mediaType="magazine"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="email">
                <div className="bg-card rounded-lg border p-6 flex items-center justify-between">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">Email Campaign</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Treat Email like a slot. Select it to include this channel for your chosen period.
                    </p>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${includeEmail ? 'bg-primary text-white border-primary' : 'bg-transparent text-primary border-primary hover:bg-primary/10'}`}
                    onClick={() => setIncludeEmail(v => !v)}
                  >
                    {includeEmail ? 'Selected' : 'Select Email'}
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="whatsapp">
                <div className="bg-card rounded-lg border p-6 flex items-center justify-between">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">WhatsApp Campaign</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Treat WhatsApp like a slot. Select it to include this channel for your chosen period.
                    </p>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${includeWhatsApp ? 'bg-primary text-white border-primary' : 'bg-transparent text-primary border-primary hover:bg-primary/10'}`}
                    onClick={() => setIncludeWhatsApp(v => !v)}
                  >
                    {includeWhatsApp ? 'Selected' : 'Select WhatsApp'}
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Slot Info</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Media Type</div>
                  <div className="font-medium capitalize">{selectedSlot.mediaType}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Page</div>
                  <div className="font-medium">{PAGE_LABELS[selectedSlot.pageType] ?? selectedSlot.pageType.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Position</div>
                  <div className="font-medium">{String(selectedSlot.position)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Dimensions</div>
                  <div className="font-medium">{selectedSlot.dimensions}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Tip: Click a tile to select/deselect it. Use Create Work Order to proceed.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {(selectedSlotIds.length > 0 || includeEmail || includeWhatsApp) && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:pl-[var(--sidebar-width)]">
          <div className="mx-auto max-w-screen-xl px-6 py-3 flex items-center justify-between gap-4">
            <>
              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedSlotIds.length}</span> slots
                {includeEmail && <span className="ml-2">• Email</span>}
                {includeWhatsApp && <span className="ml-2">• WhatsApp</span>}
              </div>
              <Button
                onClick={async () => {
                  if (!clientId || !startDate || !endDate || (selectedSlotIds.length === 0 && !includeEmail && !includeWhatsApp)) return;
                  const items = selectedSlotIds.map((id) => ({
                    slotId: id,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                  }));
                  try {
                    const res = await fetch("/api/work-orders", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        clientId,
                        businessSchoolName: client?.businessSchoolName,
                        contactName: client?.name,
                        items,
                        includeEmail,
                        includeWhatsApp,
                        rangeStart: startDate.toISOString().split('T')[0],
                        rangeEnd: endDate.toISOString().split('T')[0],
                        createdById: user?.id,
                      }),
                    }).then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(new Error(e.error || "Request failed")))));
                    const newId = res?.workOrder?.customWorkOrderId || res?.workOrder?.id;
                    toast({ title: "Work Order created", description: "You can now set pricing and send a quote." });
                    if (newId) setLocation(`/work-orders/${newId}`);
                    else setLocation(`/work-orders`);
                  } catch (e: any) {
                    toast({ title: "Error", description: e?.message || "Failed to create work order", variant: "destructive" });
                  }
                }}
              >
                Create Work Order
              </Button>
            </>
          </div>
        </div>
      )}
    </div>
  );
}


