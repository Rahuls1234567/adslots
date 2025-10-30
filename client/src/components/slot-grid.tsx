import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import type { Slot } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SlotGridProps {
  slots: Slot[];
  selectedSlots?: number[];
  onSlotSelect?: (slot: Slot) => void;
  onSlotBook?: (slot: Slot) => void;
  selectable?: boolean;
  mediaType?: "all" | "website" | "mobile" | "email" | "magazine";
}

const getGridColumns = (mediaType: string) => {
  switch (mediaType) {
    case "website":
      return "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12";
    case "mobile":
      return "grid-cols-2 md:grid-cols-4";
    case "magazine":
      return "grid-cols-1 md:grid-cols-2";
    case "email":
      return "grid-cols-2 md:grid-cols-3";
    default:
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  }
};

export function SlotGrid({ slots, selectedSlots = [], onSlotSelect, onSlotBook, selectable = false, mediaType = "all" }: SlotGridProps) {
  return (
    <div className={cn("grid gap-4", getGridColumns(mediaType))}>
      {slots.map((slot) => {
        const isSelected = selectedSlots.includes(slot.id);
        const isAvailable = slot.status === "available";
        const isBooked = slot.status === "booked";
        const isPending = slot.status === "pending";
        
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
              "relative overflow-hidden transition-all duration-200 border-2 rounded-xl",
              isAvailable && "bg-white dark:bg-card hover:scale-105 hover:shadow-2xl cursor-pointer",
              isBooked && "bg-[#8E8E93] text-white cursor-not-allowed",
              isSelected && "bg-[#7334AE] border-[#7334AE] text-white shadow-lg",
              isPending && "animate-pulse-border",
              !isAvailable && !isBooked && !isPending && "opacity-75"
            )}
          >
            {isBooked && (
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    #8E8E93,
                    #8E8E93 10px,
                    transparent 10px,
                    transparent 20px
                  )`
                }}
              />
            )}

            {isSelected && (
              <div className="absolute top-2 right-2 bg-white text-[#7334AE] rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}

            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className={cn("text-base capitalize", (isSelected || isBooked) && "text-white")}>
                    {slot.pageType.replace(/_/g, " ")}
                  </CardTitle>
                  <CardDescription className={cn("capitalize", (isSelected || isBooked) && "text-white/80")}>
                    {slot.mediaType} • {slot.position}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    isAvailable ? "default" :
                    isBooked ? "secondary" :
                    isPending ? "outline" :
                    "destructive"
                  }
                  className={cn(
                    isPending && "animate-pulse",
                    isSelected && "bg-white text-[#7334AE]"
                  )}
                >
                  {slot.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className={cn("text-muted-foreground", (isSelected || isBooked) && "text-white/70")}>Dimensions:</span>
                  <span className={cn("font-medium", (isSelected || isBooked) && "text-white")}>{slot.dimensions}</span>
                </div>

                {slot.magazinePageNumber && (
                  <div className="flex justify-between text-sm">
                    <span className={cn("text-muted-foreground", (isSelected || isBooked) && "text-white/70")}>Page:</span>
                    <span className={cn("font-medium", (isSelected || isBooked) && "text-white")}>{slot.magazinePageNumber}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <div>
                    <div className={cn("text-xs text-muted-foreground", (isSelected || isBooked) && "text-white/70")}>Price</div>
                    <div className={cn("text-xl font-bold", (isSelected || isBooked) ? "text-white" : "text-primary")}>
                      ₹{slot.pricing}
                    </div>
                  </div>
                  
                  {isAvailable && onSlotBook && !selectable && (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSlotBook(slot);
                      }} 
                      variant={isSelected ? "secondary" : "default"}
                      data-testid={`button-book-${slot.id}`}
                    >
                      Book Now
                    </Button>
                  )}
                  
                  {isBooked && (
                    <Badge variant="secondary">Reserved</Badge>
                  )}
                  
                  {isPending && (
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                      Processing
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
