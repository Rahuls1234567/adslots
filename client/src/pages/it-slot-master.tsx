import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Slot } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { Settings, Search } from "lucide-react";

const MEDIA_OPTIONS: Array<{ value: "all" | Slot["mediaType"]; label: string }> = [
  { value: "all", label: "All media" },
  { value: "website", label: "Website" },
  { value: "mobile", label: "Mobile App" },
  { value: "magazine", label: "Magazine" },
  { value: "email", label: "Email" },
];

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

const PAGE_OPTIONS: Array<{ value: "all" | keyof typeof PAGE_LABELS | "other"; label: string }> = [
  { value: "all", label: "All pages" },
  { value: "main", label: PAGE_LABELS.main },
  { value: "student_home", label: PAGE_LABELS.student_home },
  { value: "student_login", label: PAGE_LABELS.student_login },
  { value: "aimcat_results_analysis", label: PAGE_LABELS.aimcat_results_analysis },
  { value: "chat_pages", label: PAGE_LABELS.chat_pages },
  { value: "other", label: "Other" },
];

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function ITSlotMasterPage() {
  const { user } = useAuth();

  if (!user || user.role !== "it") {
    return <Redirect to="/" />;
  }

  const { data: slots = [], isLoading } = useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [mediaFilter, setMediaFilter] = useState<(typeof MEDIA_OPTIONS)[number]["value"]>("all");
  const [pageFilter, setPageFilter] = useState<(typeof PAGE_OPTIONS)[number]["value"]>("all");


  const filteredSlots = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (slots || []).filter((slot) => {
      if (mediaFilter !== "all" && slot.mediaType !== mediaFilter) return false;
      if (pageFilter !== "all") {
        if (pageFilter === "other") {
          if (slot.pageType in PAGE_LABELS) return false;
        } else if (slot.pageType !== pageFilter) return false;
      }
      if (term) {
        const searchable = `${slot.pageType} ${slot.position} ${slot.dimensions} ${slot.mediaType}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [slots, searchTerm, mediaFilter, pageFilter]);


  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Slot Master</h1>
        <p className="text-muted-foreground">Manage slot configurations (page name, location, size, banner type)</p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search slots by page, position, dimensions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={mediaFilter} onValueChange={(v: any) => setMediaFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEDIA_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pageFilter} onValueChange={(v: any) => setPageFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredSlots.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No slots found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSlots.map((slot) => (
            <Card key={slot.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Slot {slot.slotId || `#${slot.id}`}</CardTitle>
                  <Badge variant="secondary" className="capitalize">{slot.status}</Badge>
                </div>
                <CardDescription className="capitalize">{slot.mediaType}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Page:</span>{" "}
                    <span className="font-medium">{PAGE_LABELS[slot.pageType] || humanize(slot.pageType)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>{" "}
                    <span className="font-medium">{humanize(slot.position)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>{" "}
                    <span className="font-medium">{slot.dimensions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}

