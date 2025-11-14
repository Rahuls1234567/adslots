import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (start: Date | null, end: Date | null) => void;
}

export function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(selectedYear, selectedMonth, day);
    clickedDate.setHours(0, 0, 0, 0); // Normalize to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clickedDate < today) return; // disallow selecting past dates
    
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onDateChange(clickedDate, null);
    } else if (clickedDate.getTime() === startDate.getTime()) {
      // Clicked same date, reset
      onDateChange(null, null);
    } else if (clickedDate < startDate) {
      // Clicked before start date, swap them
      onDateChange(clickedDate, startDate);
    } else {
      // Set end date
      onDateChange(startDate, clickedDate);
    }
  };

  const isDateInRange = (day: number) => {
    if (!startDate) return false;
    const currentDateCheck = new Date(selectedYear, selectedMonth, day);
    if (!endDate) return currentDateCheck.getTime() === startDate.getTime();
    return currentDateCheck >= startDate && currentDateCheck <= endDate;
  };

  const isStartDate = (day: number) => {
    if (!startDate) return false;
    const currentDateCheck = new Date(selectedYear, selectedMonth, day);
    return currentDateCheck.getTime() === startDate.getTime();
  };

  const isEndDate = (day: number) => {
    if (!endDate) return false;
    const currentDateCheck = new Date(selectedYear, selectedMonth, day);
    return currentDateCheck.getTime() === endDate.getTime();
  };

  const previousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDayOfMonth = getFirstDayOfMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPrevDisabled = () => {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const lastDayPrev = new Date(prevYear, prevMonth + 1, 0);
    lastDayPrev.setTime(new Date(prevYear, prevMonth, lastDayPrev.getDate()).setHours(0,0,0,0));
    return lastDayPrev < today;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Select Date Range
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={previousMonth}
            disabled={isPrevDisabled()}
            data-testid="button-prev-month"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="h-8" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="h-8" data-testid="select-month">
              <SelectValue placeholder={months[selectedMonth]} />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={month} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            data-testid="button-next-month"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div key={i} className="text-xs font-medium text-muted-foreground p-1">
              {day}
            </div>
          ))}
          
          {emptyDays.map((i) => (
            <div key={`empty-${i}`} className="p-1" />
          ))}
          
          {daysArray.map((day) => {
            const d = new Date(selectedYear, selectedMonth, day);
            d.setHours(0,0,0,0);
            const past = d < today;
            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={past}
                className={cn(
                  "aspect-square p-1 text-sm rounded-md transition-colors",
                  isDateInRange(day) && "bg-primary text-primary-foreground",
                  (isStartDate(day) || isEndDate(day)) && "bg-primary text-primary-foreground font-bold",
                  !past && !isDateInRange(d.getDate()) && "hover:bg-accent",
                  past && "opacity-40 cursor-not-allowed"
                )}
                data-testid={`day-${day}`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {startDate && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div className="flex justify-between">
              <span>Start:</span>
              <span className="font-medium">{startDate.toLocaleDateString()}</span>
            </div>
            {endDate && (
              <div className="flex justify-between">
                <span>End:</span>
                <span className="font-medium">{endDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
