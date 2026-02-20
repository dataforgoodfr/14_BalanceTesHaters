import { Calendar } from "@/components/ui/calendar";
import {  addMonths, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

function DateRangePicker() {
  const today = new Date();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: addMonths(today, -3),
    to: today,
  });

  return (
    <div className="flex items-center gap-2">
      <Input
        value={`${dateRange?.from ? format(dateRange.from, "dd-MM-yyyy") : ""} - ${dateRange?.to ? format(dateRange.to, "dd-MM-yyyy") : ""}`}
        readOnly
      />
      <Popover>
        <PopoverTrigger>
          <Button variant="outline" size="icon">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            disabled={(date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangePicker;
