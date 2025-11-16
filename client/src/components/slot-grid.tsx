import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import type { Slot } from "@shared/schema";
import { cn } from "@/lib/utils";

const PAGE_LABELS: Record<string, string> = {
  main: "Landing page",
  student_home: "Student home page",
  student_login: "Login page",
  aimcat_results_analysis: "AIMCAT results and analysis page",
  chat_pages: "Chat pages",
};

interface SlotGridProps {
  slots: Slot[];
  selectedSlots?: number[];
  onSlotSelect?: (slot: Slot) => void;
  onSlotInfo?: (slot: Slot) => void;
  selectable?: boolean;
  mediaType?: "all" | "website" | "mobile" | "email" | "magazine" | "whatsapp";
}

const getGridColumns = (mediaType: string) => {
  switch (mediaType) {
    case "website":
      // Two cards per row for better readability and modern look
      return "grid-cols-1 md:grid-cols-2";
    case "mobile":
      return "grid-cols-1 md:grid-cols-2";
    case "whatsapp":
      return "grid-cols-1 md:grid-cols-2";
    case "magazine":
      return "grid-cols-1 md:grid-cols-2";
    case "email":
      return "grid-cols-1 md:grid-cols-2";
    default:
      return "grid-cols-1 md:grid-cols-2";
  }
};

export function SlotGrid({ slots, selectedSlots = [], onSlotSelect, onSlotInfo, selectable = false, mediaType = "all" }: SlotGridProps) {
  return (
    <div className={cn("grid gap-5", getGridColumns(mediaType))}>
      {slots.map((slot) => {
        const isSelected = selectedSlots.includes(slot.id);
        const isAvailable = slot.status === "available";
        const isBooked = slot.status === "booked";
        const isPending = slot.status === "pending";
        const readablePosition = String(slot.position).replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
        const readablePage = PAGE_LABELS[slot.pageType] ?? slot.pageType.replace(/_/g, " ");
        
        return (
          <Card
            key={slot.id}
            data-testid={`card-slot-${slot.id}`}
            onClick={() => {
              if (selectable && isAvailable && onSlotSelect) {
                onSlotSelect(slot);
              }
            }}
            className={cn(
              "relative overflow-hidden transition-all duration-200 border rounded-xl bg-card hover:shadow-lg",
              isAvailable && !isSelected && "hover:border-primary/50 cursor-pointer",
              isBooked && "bg-muted/50 border-muted cursor-not-allowed",
              isPending && "bg-muted/30 border-muted cursor-not-allowed",
              isSelected && "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
              !isAvailable && !isBooked && !isPending && "opacity-60"
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}

            <CardHeader className="p-5 pb-3 space-y-2">
              <div className="space-y-2">
                <div className={cn(
                  "text-xs uppercase tracking-wider font-medium",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}>
                  {slot.mediaType.toUpperCase()} • {readablePage.toUpperCase()}
                </div>
                <CardTitle className={cn(
                  "text-xl font-bold leading-tight",
                  isSelected && "text-primary"
                )}>
                  {readablePosition}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="px-5 pb-5 space-y-3 pt-3">
              <div className="space-y-3 border-t border-border/50 pt-3">
                {/* Dimensions */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs text-muted-foreground",
                    isSelected && "text-primary/70"
                  )}>
                    Dimensions
                  </span>
                  <span className={cn(
                    "text-sm font-semibold",
                    isSelected && "text-primary"
                  )}>
                    {slot.dimensions}
                  </span>
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs text-muted-foreground",
                    isSelected && "text-primary/70"
                  )}>
                    Price
                  </span>
                  <span className={cn(
                    "text-sm font-semibold",
                    isSelected && "text-primary"
                  )}>
                    ₹{Number(slot.pricing).toLocaleString()}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs text-muted-foreground",
                    isSelected && "text-primary/70"
                  )}>
                    Status
                  </span>
                  <Badge
                    variant={isAvailable ? "default" : isBooked ? "secondary" : isPending ? "outline" : "destructive"}
                    className={cn(
                      "text-xs font-normal px-2 py-0.5",
                      isAvailable && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
                      isBooked && "bg-muted text-muted-foreground",
                      isPending && "border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {isAvailable ? "Available" : isBooked ? "Booked" : isPending ? "Pending" : slot.status}
                  </Badge>
                </div>

                {/* Magazine Page Number (if applicable) */}
                {slot.magazinePageNumber && (
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs text-muted-foreground",
                      isSelected && "text-primary/70"
                    )}>
                      Page Number
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      isSelected && "text-primary"
                    )}>
                      {slot.magazinePageNumber}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
