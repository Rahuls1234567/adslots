// import { useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Skeleton } from "@/components/ui/skeleton";
// import { useAuth } from "@/lib/auth-context";
// import { DateRangePicker } from "@/components/date-range-picker";
// import { SlotGrid } from "@/components/slot-grid";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { type Slot } from "@shared/schema";
// import { Monitor, Mail, MessageCircle } from "lucide-react";
// import { useLocation } from "wouter";
// import { useToast } from "@/hooks/use-toast";

// const PAGE_LABELS: Record<string, string> = {
//   main: "Landing page",
//   student_home: "Student home page",
//   student_login: "Login page",
//   aimcat_results_analysis: "AIMCAT results and analysis page",
//   chat_pages: "Chat pages",
// };

// export default function ClientDashboard() {
//   const { user } = useAuth();
//   const { toast } = useToast();
//   const [, setLocation] = useLocation();
//   const [startDate, setStartDate] = useState<Date | null>(null);
//   const [endDate, setEndDate] = useState<Date | null>(null);
//   const [selectedMedia, setSelectedMedia] = useState<"website" | "mobile" | "magazine" | "email" | "whatsapp">("website");
//   const [selectedPage, setSelectedPage] = useState<string>("all");
//   const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
//   const [infoOpen, setInfoOpen] = useState(false);
//   const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
//   const [selectedBySection, setSelectedBySection] = useState<Record<string, number>>({});
//   const [includeEmail, setIncludeEmail] = useState(false);
//   const [includeWhatsApp, setIncludeWhatsApp] = useState(false);

//   // Fetch available slots based on selected dates and page
//   const { data: availableSlots, isLoading } = useQuery<any[]>({
//     queryKey: ["/api/slots/availability", { 
//           startDate: startDate?.toISOString().split("T")[0],
//           endDate: endDate?.toISOString().split("T")[0],
//           pageType: selectedMedia === "website" && selectedPage !== "all" ? selectedPage : undefined,
//           mediaType: selectedMedia,
//     }],
//     enabled: !!startDate && !!endDate,
//   });

//   // No prices shown on client; manager sets pricing in work order

//   const [requestRaised, setRequestRaised] = useState(false);

//   const handleDateChange = (start: Date | null, end: Date | null) => {
//     setStartDate(start);
//     setEndDate(end);
//     setRequestRaised(false);
//   };

//   const toggleSelectSlot = (slot: Slot) => {
//     const sectionKey = slot.mediaType === "website" ? `website:${slot.pageType}` : slot.mediaType;

//     setSelectedSlotIds((prev) => {
//       const isAlreadySelected = prev.includes(slot.id);
//       if (isAlreadySelected) {
//         // Deselect and clear section mapping
//         setSelectedBySection((map) => {
//           const next = { ...map };
//           if (next[sectionKey] === slot.id) delete next[sectionKey];
//           return next;
//         });
//         return prev.filter((id) => id !== slot.id);
//       }

//       // If another slot is already picked for this section, block selection
//       const existingInSection = selectedBySection[sectionKey];
//       if (existingInSection && existingInSection !== slot.id) {
//         toast({
//           title: "One slot per section",
//           description: "You can select only one slot within the same section.",
//           variant: "destructive",
//         });
//         return prev;
//       }

//       // Otherwise select and record mapping
//       setSelectedBySection((map) => ({ ...map, [sectionKey]: slot.id }));
//       return [...prev, slot.id];
//     });
//   };

//   const openInfo = (slot: Slot) => {
//     setSelectedSlot(slot);
//     setInfoOpen(true);
//   };

//   // Filter slots by selected media type
//   const filteredSlots =
//     availableSlots?.filter((slot) => {
//       if (slot.mediaType !== selectedMedia) return false;
//       if (selectedMedia === "website" && selectedPage !== "all") {
//         return slot.pageType === selectedPage;
//       }
//       return true;
//     }) || [];

//   const pageTypes = [
//     { value: "all", label: "All pages" },
//     { value: "main", label: "Landing page" },
//     { value: "student_home", label: "Student home page" },
//     { value: "student_login", label: "Login page" },
//     { value: "aimcat_results_analysis", label: "AIMCAT results and analysis page" },
//     { value: "chat_pages", label: "Chat pages" },
//   ];

//   return (
//     <div className="flex h-full">
//       {/* Left Sidebar - Date Picker (25%) */}
//       <div className="w-80 border-r bg-muted/30 p-6 space-y-6">
//         <div>
//           <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
//             Welcome, {user?.name}
//           </h1>
//           <p className="text-sm text-muted-foreground mt-1">
//             Select your ad campaign dates
//           </p>
//         </div>

//         <DateRangePicker
//           startDate={startDate}
//           endDate={endDate}
//           onDateChange={handleDateChange}
//         />

//         {startDate && endDate && (
//           <Card>
//             <CardHeader className="pb-3">
//               <CardTitle className="text-sm">Selected Period</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-xs text-muted-foreground space-y-1">
//                 <div className="flex justify-between">
//                   <span>Duration:</span>
//                   <span className="font-medium">
//                     {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Slots Available:</span>
//                   <span className="font-medium text-primary">
//                     {filteredSlots.length}
//                   </span>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}
//       </div>

//       {/* Right Main Area - Slot Selection (75%) */}
//       <div className="flex-1 p-8 space-y-6 overflow-auto">
//         <Card>
//           <CardHeader>
//             <div className="flex items-center justify-between">
//               <div>
//                 <CardTitle className="text-xl">Select Slots</CardTitle>
//                 <CardDescription className="mt-1">
//                   Choose your advertising slots for the selected dates
//                 </CardDescription>
//               </div>
//               <Monitor className="w-6 h-6 text-muted-foreground" />
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             <Tabs value={selectedMedia} onValueChange={(v) => setSelectedMedia(v as any)}>
//               <TabsList>
//                 <TabsTrigger value="website">Website</TabsTrigger>
//                 <TabsTrigger value="mobile">Mobile App</TabsTrigger>
//                 <TabsTrigger value="magazine">Magazine</TabsTrigger>
//                 <TabsTrigger value="email">Email</TabsTrigger>
//                 <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
//               </TabsList>

//               <TabsContent value="website" className="space-y-4">
//                 <div className="flex items-center gap-4">
//                   <span className="text-sm font-medium">Page</span>
//                   <Select value={selectedPage} onValueChange={setSelectedPage}>
//                     <SelectTrigger className="w-64" data-testid="select-page-type">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {pageTypes.map((page) => (
//                         <SelectItem key={page.value} value={page.value}>
//                           {page.label}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 {!startDate || !endDate ? (
//                   <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
//                     <p className="text-muted-foreground">Please select start and end dates to view available slots</p>
//                   </div>
//                 ) : isLoading ? (
//                   <div className="grid grid-cols-6 gap-4">
//                     {[...Array(12)].map((_, i) => (
//                       <Skeleton key={i} className="h-24 w-full" />
//                     ))}
//                   </div>
//                 ) : filteredSlots.length === 0 ? (
//                   <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
//                     <p className="text-muted-foreground">No slots available for the selected page and dates</p>
//                   </div>
//                 ) : (
//                   <div className="bg-card rounded-lg border p-6">
//                     <SlotGrid
//                       slots={filteredSlots}
//                       selectedSlots={selectedSlotIds}
//                       onSlotSelect={toggleSelectSlot}
//                       onSlotInfo={openInfo}
//                       selectable
//                       mediaType="website"
//                     />
//                   </div>
//                 )}
//               </TabsContent>

//               <TabsContent value="mobile">
//                 {!startDate || !endDate ? (
//                   <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
//                     <p className="text-muted-foreground">Please select dates to view mobile slots</p>
//                   </div>
//                 ) : isLoading ? (
//                   <div className="grid grid-cols-4 gap-4">
//                     {[...Array(8)].map((_, i) => (
//                       <Skeleton key={i} className="h-28 w-full" />
//                     ))}
//                   </div>
//                 ) : filteredSlots.length === 0 ? (
//                   <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
//                     <p className="text-muted-foreground">No mobile slots available for the selected dates</p>
//                   </div>
//                 ) : (
//                   <div className="bg-card rounded-lg border p-6">
//                     <SlotGrid
//                       slots={filteredSlots}
//                       selectedSlots={selectedSlotIds}
//                       onSlotSelect={toggleSelectSlot}
//                       onSlotInfo={openInfo}
//                       selectable
//                       mediaType="mobile"
//                     />
//                   </div>
//                 )}
//               </TabsContent>

//               <TabsContent value="magazine">
//                 {!startDate || !endDate ? (
//                   <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
//                     <p className="text-muted-foreground">Please select dates to view magazine slots</p>
//                   </div>
//                 ) : isLoading ? (
//                   <div className="grid grid-cols-2 gap-4">
//                     {[...Array(4)].map((_, i) => (
//                       <Skeleton key={i} className="h-40 w-full" />
//                     ))}
//                   </div>
//                 ) : filteredSlots.length === 0 ? (
//                   <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
//                     <p className="text-muted-foreground">No magazine slots available</p>
//                   </div>
//                 ) : (
//                   <div className="bg-card rounded-lg border p-6">
//                     <SlotGrid
//                       slots={filteredSlots}
//                       selectedSlots={selectedSlotIds}
//                       onSlotSelect={toggleSelectSlot}
//                       onSlotInfo={openInfo}
//                       selectable
//                       mediaType="magazine"
//                     />
//                   </div>
//                 )}
//               </TabsContent>

//               <TabsContent value="email">
//                 <div className="bg-card rounded-lg border p-6 flex items-center justify-between">
//                   <div className="text-left">
//                     <div className="flex items-center gap-2">
//                       <Mail className="h-5 w-5 text-muted-foreground" />
//                       <h3 className="font-semibold">Email Campaign</h3>
//                     </div>
//                     <p className="text-sm text-muted-foreground mt-1">
//                       Treat Email like a slot. Select it to include this channel for your chosen period.
//                     </p>
                    
//                   </div>
//                   <button
//                     className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${includeEmail ? 'bg-primary text-white border-primary' : 'bg-transparent text-primary border-primary hover:bg-primary/10'}`}
//                     onClick={() => setIncludeEmail(v => !v)}
//                     data-testid="button-toggle-email"
//                   >
//                     {includeEmail ? 'Selected' : 'Select Email'}
//                   </button>
//                 </div>
//               </TabsContent>

//               <TabsContent value="whatsapp">
//                 <div className="bg-card rounded-lg border p-6 flex items-center justify-between">
//                   <div className="text-left">
//                     <div className="flex items-center gap-2">
//                       <MessageCircle className="h-5 w-5 text-muted-foreground" />
//                       <h3 className="font-semibold">WhatsApp Campaign</h3>
//                     </div>
//                     <p className="text-sm text-muted-foreground mt-1">
//                       Treat WhatsApp like a slot. Select it to include this channel for your chosen period.
//                     </p>
                    
//                   </div>
//                   <button
//                     className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${includeWhatsApp ? 'bg-primary text-white border-primary' : 'bg-transparent text-primary border-primary hover:bg-primary/10'}`}
//                     onClick={() => setIncludeWhatsApp(v => !v)}
//                     data-testid="button-toggle-whatsapp"
//                   >
//                     {includeWhatsApp ? 'Selected' : 'Select WhatsApp'}
//                   </button>
//                 </div>
//               </TabsContent>
//             </Tabs>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Info modal */}
//       <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
//         <DialogContent className="sm:max-w-[480px]">
//           <DialogHeader>
//             <DialogTitle>Slot Info</DialogTitle>
//           </DialogHeader>
//           {selectedSlot && (
//                 <div className="space-y-3">
//               <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
//                 <div>
//                   <div className="text-sm text-muted-foreground">Media Type</div>
//                   <div className="font-medium capitalize">{selectedSlot.mediaType}</div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-muted-foreground">Page</div>
//                   <div className="font-medium">{PAGE_LABELS[selectedSlot.pageType] ?? selectedSlot.pageType.replace(/_/g, ' ')}</div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-muted-foreground">Position</div>
//                   <div className="font-medium">{String(selectedSlot.position)}</div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-muted-foreground">Dimensions</div>
//                   <div className="font-medium">{selectedSlot.dimensions}</div>
//                 </div>
                
//               </div>
//               <div className="text-xs text-muted-foreground">Tip: Click a tile to select/deselect it. Use Raise Request below to send selections to Manager.</div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       {(selectedSlotIds.length > 0 || includeEmail || includeWhatsApp || requestRaised) && (
//         <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:pl-[var(--sidebar-width)]">
//           <div className="mx-auto max-w-screen-xl px-6 py-3 flex items-center justify-between gap-4">
//             <>
//               <div className="text-sm text-muted-foreground">
//                 Selected: <span className="font-medium text-foreground">{selectedSlotIds.length}</span> slots
//                 {includeEmail && <span className="ml-2">• Email</span>}
//                 {includeWhatsApp && <span className="ml-2">• WhatsApp</span>}
//               </div>
//               <Button
//                 onClick={() => {
//                   if (!startDate || !endDate || (selectedSlotIds.length === 0 && !includeEmail && !includeWhatsApp)) return;
//                   const payload = {
//                     slotIds: selectedSlotIds,
//                     startDate: startDate.toISOString().split('T')[0],
//                     endDate: endDate.toISOString().split('T')[0],
//                     includeEmail,
//                     includeWhatsApp,
//                   };
//                   try {
//                     localStorage.setItem('pendingRequestSelection', JSON.stringify(payload));
//                     setLocation('/request-review');
//                   } catch {
//                     toast({ title: 'Error', description: 'Unable to proceed. Please try again.', variant: 'destructive' });
//                   }
//                 }}
//               >
//                 Proceed
//               </Button>
// </>
// </div>
// </div>
// )}
// </div>
// );
// }
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { SlotGrid } from "@/components/slot-grid";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Slot } from "@shared/schema";
import { Monitor, Mail, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Helper function to map enum value to database media type
const mapEnumToMediaType = (enumValue: string): string => {
  const mapping: Record<string, string> = {
    "website": "Website",
    "mobile": "Mobile APP",
    "email": "Email",
    "magazine": "Magazine",
    "whatsapp": "Whatsapp",
  };
  return mapping[enumValue] || enumValue;
};

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<"website" | "mobile" | "magazine" | "email" | "whatsapp">("website");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [selectedBySection, setSelectedBySection] = useState<Record<string, number>>({});
  const [includeEmail, setIncludeEmail] = useState(false);
  const [includeWhatsApp, setIncludeWhatsApp] = useState(false);

  // Get database media type for API calls
  const dbMediaType = mapEnumToMediaType(selectedMedia);

  // Fetch positions from database based on selected media type
  const { data: positionsData, isLoading: isLoadingPositions } = useQuery<string[]>({
    queryKey: ["/api/positions", dbMediaType],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/positions?mediaType=${encodeURIComponent(dbMediaType)}`);
        const result = await response.json();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error("Error fetching positions:", error);
        return [];
      }
    },
    enabled: selectedMedia !== "email", // Don't fetch for email
    retry: 1,
    staleTime: 0,
  });

  const positions = Array.isArray(positionsData) ? positionsData : [];

  // Fetch available slots based on selected dates and position
  const { data: availableSlots, isLoading } = useQuery<any[]>({
    queryKey: ["/api/slots/availability", { 
      startDate: startDate?.toISOString().split("T")[0],
      endDate: endDate?.toISOString().split("T")[0],
      mediaType: selectedMedia,
    }],
    enabled: !!startDate && !!endDate,
  });

  const [requestRaised, setRequestRaised] = useState(false);

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    setRequestRaised(false);
  };

  const toggleSelectSlot = (slot: Slot) => {
    const sectionKey = slot.mediaType === "website" ? `website:${slot.pageType}` : slot.mediaType;

    setSelectedSlotIds((prev) => {
      const isAlreadySelected = prev.includes(slot.id);
      if (isAlreadySelected) {
        // Deselect and clear section mapping
        setSelectedBySection((map) => {
          const next = { ...map };
          if (next[sectionKey] === slot.id) delete next[sectionKey];
          return next;
        });
        return prev.filter((id) => id !== slot.id);
      }

      // If another slot is already picked for this section, block selection
      const existingInSection = selectedBySection[sectionKey];
      if (existingInSection && existingInSection !== slot.id) {
        toast({
          title: "One slot per section",
          description: "You can select only one slot within the same section.",
          variant: "destructive",
        });
        return prev;
      }

      // Otherwise select and record mapping
      setSelectedBySection((map) => ({ ...map, [sectionKey]: slot.id }));
      return [...prev, slot.id];
    });
  };

  const openInfo = (slot: Slot) => {
    setSelectedSlot(slot);
    setInfoOpen(true);
  };

  // Filter slots by selected media type and position
  const filteredSlots =
    availableSlots?.filter((slot) => {
      if (slot.mediaType !== selectedMedia) return false;
      if (selectedPosition !== "all" && slot.position !== selectedPosition) return false;
      return true;
    }) || [];

  // Reset position when media type changes
  const handleMediaChange = (media: "website" | "mobile" | "magazine" | "email" | "whatsapp") => {
    setSelectedMedia(media);
    setSelectedPosition("all"); // Reset position filter when media type changes
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <div className="border-b bg-background/80 backdrop-blur-sm shadow-sm flex-shrink-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
                Welcome, {user?.name}
              </h1>
              <p className="text-muted-foreground">
                Select your ad campaign dates and choose advertising slots
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">From Date</label>
                <input
                  type="date"
                  className="h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={startDate ? startDate.toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const newStart = e.target.value ? new Date(e.target.value) : null;
                    handleDateChange(newStart, endDate);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">To Date</label>
                <input
                  type="date"
                  className="h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={endDate ? endDate.toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const newEnd = e.target.value ? new Date(e.target.value) : null;
                    handleDateChange(startDate, newEnd);
                  }}
                />
              </div>
            </div>
          </div>

          {startDate && endDate && (
            <Card className="border-2 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Campaign Period Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-8 text-sm">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</div>
                    <div className="text-2xl font-bold text-foreground">
                      {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Slots</div>
                    <div className="text-2xl font-bold text-primary">
                      {filteredSlots.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8 pb-24">
          <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">Select Advertising Slots</CardTitle>
                <CardDescription className="text-base">
                  Choose your advertising slots for the selected campaign period
                </CardDescription>
              </div>
              <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Media Type Selector - Enhanced Segmented Control */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-foreground">Media Type</label>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-muted/60 p-1.5 shadow-inner">
                <button
                  onClick={() => handleMediaChange("website")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedMedia === "website"
                      ? "bg-background text-foreground shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  Website
                </button>
                <button
                  onClick={() => handleMediaChange("whatsapp")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedMedia === "whatsapp"
                      ? "bg-background text-foreground shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => handleMediaChange("mobile")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedMedia === "mobile"
                      ? "bg-background text-foreground shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  Mobile App
                </button>
                <button
                  onClick={() => handleMediaChange("magazine")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedMedia === "magazine"
                      ? "bg-background text-foreground shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  Magazine
                </button>
                <button
                  onClick={() => handleMediaChange("email")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedMedia === "email"
                      ? "bg-background text-foreground shadow-md scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  Email
                </button>
              </div>
            </div>

            {/* Position dropdown - visible for all media types except email */}
            {(selectedMedia === "website" || selectedMedia === "mobile" || selectedMedia === "magazine" || selectedMedia === "whatsapp") && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="text-sm font-semibold text-foreground min-w-[80px]">Position</label>
                <Select 
                  value={selectedPosition} 
                  onValueChange={setSelectedPosition}
                  disabled={isLoadingPositions || positions.length === 0}
                >
                  <SelectTrigger className="w-full sm:w-80 h-11" data-testid="select-position">
                    <SelectValue placeholder={
                      isLoadingPositions 
                        ? "Loading positions..." 
                        : positions.length === 0 
                          ? "No positions available" 
                          : "All positions"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All positions</SelectItem>
                    {isLoadingPositions ? (
                      <SelectItem value="loading" disabled>Loading positions...</SelectItem>
                    ) : positions.length > 0 ? (
                      positions.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No positions available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Content based on selected media */}
            {selectedMedia === "website" && (
              <div className="space-y-4">
                {!startDate || !endDate ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-base font-medium text-foreground">Select Campaign Dates</p>
                      <p className="text-sm text-muted-foreground max-w-md">Please select start and end dates above to view available advertising slots</p>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-medium text-foreground">No Slots Available</p>
                      <p className="text-sm text-muted-foreground max-w-md">No slots found for the selected position and dates. Try adjusting your filters or date range.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border-2 p-6 shadow-sm">
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
              </div>
            )}

            {selectedMedia === "mobile" && (
              <div>
                {!startDate || !endDate ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-base font-medium text-foreground">Select Campaign Dates</p>
                      <p className="text-sm text-muted-foreground max-w-md">Please select start and end dates above to view available mobile app slots</p>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-medium text-foreground">No Mobile Slots Available</p>
                      <p className="text-sm text-muted-foreground max-w-md">No mobile app slots found for the selected position and dates.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border-2 p-6 shadow-sm">
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
              </div>
            )}

            {selectedMedia === "magazine" && (
              <div>
                {!startDate || !endDate ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-base font-medium text-foreground">Select Campaign Dates</p>
                      <p className="text-sm text-muted-foreground max-w-md">Please select start and end dates above to view available magazine slots</p>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-medium text-foreground">No Magazine Slots Available</p>
                      <p className="text-sm text-muted-foreground max-w-md">No magazine slots found for the selected position and dates.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border-2 p-6 shadow-sm">
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
              </div>
            )}

            {selectedMedia === "email" && (
              <div className="bg-gradient-to-br from-card to-muted/30 rounded-xl border-2 p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold">Email Campaign</h3>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Treat Email like a slot. Select it to include this channel for your chosen campaign period.
                    </p>
                  </div>
                  <button
                    className={`px-6 py-3 rounded-lg text-sm font-semibold border-2 transition-all duration-200 shadow-sm ${
                      includeEmail 
                        ? 'bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90' 
                        : 'bg-transparent text-primary border-primary hover:bg-primary/10 hover:shadow-md'
                    }`}
                    onClick={() => setIncludeEmail(v => !v)}
                    data-testid="button-toggle-email"
                  >
                    {includeEmail ? '✓ Selected' : 'Select Email'}
                  </button>
                </div>
              </div>
            )}

            {selectedMedia === "whatsapp" && (
              <div>
                {!startDate || !endDate ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-base font-medium text-foreground">Select Campaign Dates</p>
                      <p className="text-sm text-muted-foreground max-w-md">Please select start and end dates above to view available WhatsApp slots</p>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-base font-medium text-foreground">No WhatsApp Slots Available</p>
                      <p className="text-sm text-muted-foreground max-w-md">No WhatsApp slots found for the selected position and dates.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border-2 p-6 shadow-sm">
                    <SlotGrid
                      slots={filteredSlots}
                      selectedSlots={selectedSlotIds}
                      onSlotSelect={toggleSelectSlot}
                      onSlotInfo={openInfo}
                      selectable
                      mediaType="whatsapp"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </div>

      {/* Info modal */}
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
              <div className="text-xs text-muted-foreground">Tip: Click a tile to select/deselect it. Use Raise Request below to send selections to Manager.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {(selectedSlotIds.length > 0 || includeEmail || includeWhatsApp || requestRaised) && (
        <div className="fixed bottom-0 left-0 right-0 border-t-2 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-2xl z-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Selected:</span>
                <span className="font-bold text-foreground text-base">{selectedSlotIds.length}</span>
                <span className="text-muted-foreground">slots</span>
                {includeEmail && (
                  <span className="ml-3 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                    Email
                  </span>
                )}
                {includeWhatsApp && (
                  <span className="ml-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                    WhatsApp
                  </span>
                )}
              </div>
            </div>
            <Button
              size="lg"
              className="px-8 font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={() => {
                if (!startDate || !endDate || (selectedSlotIds.length === 0 && !includeEmail && !includeWhatsApp)) return;
                const payload = {
                  slotIds: selectedSlotIds,
                  startDate: startDate.toISOString().split('T')[0],
                  endDate: endDate.toISOString().split('T')[0],
                  includeEmail,
                  includeWhatsApp,
                };
                try {
                  localStorage.setItem('pendingRequestSelection', JSON.stringify(payload));
                  setLocation('/request-review');
                } catch {
                  toast({ title: 'Error', description: 'Unable to proceed. Please try again.', variant: 'destructive' });
                }
              }}
            >
              Proceed to Review
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
