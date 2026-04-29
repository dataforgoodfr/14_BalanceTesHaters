import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";
import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { fr } from "date-fns/locale";
import { fr as frDP } from "react-day-picker/locale";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";

type DateRangePickerProps = Readonly<{
  startDate: Date;
  onChange?: (range: DateRange | undefined) => void;
}>;

function DateRangePicker({ startDate, onChange }: DateRangePickerProps) {
  const today = new Date();

  const [calendarOpen, setCalendarOpen] = useState(false);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startDate,
    to: today,
  });

  // Update dateRange whenever startDate changes
  React.useEffect(() => {
    setDateRange({ from: startDate, to: today });
  }, [startDate]);

  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    onChange?.(range);
  };

  const handleLastDays = (days: number | undefined) => {
    let dateRange: DateRange;
    if (days) {
      dateRange = {
        from: new Date(new Date().setDate(new Date().getDate() - days)),
        to: new Date(),
      };
      dateRange.from?.setHours(0, 0, 0, 0);
      dateRange.to?.setHours(0, 0, 0, 0);
      handleSelect(dateRange);
    } else {
      handleSelect(undefined);
    }
    setCalendarOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger>
          <InputGroup className="w-55">
            <InputGroupAddon align="inline-start">
              <CalendarIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={`${dateRange?.from ? format(dateRange.from, "dd MMM yyyy", { locale: fr }) : ""} - ${dateRange?.to ? format(dateRange.to, "dd MMM yyyy", { locale: fr }) : ""}`}
              readOnly
            />
          </InputGroup>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <div className="flex flex-col items-center ">
            <ButtonGroup className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLastDays(7)}
              >
                7 derniers jours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLastDays(30)}
              >
                30 derniers jours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLastDays(365)}
              >
                12 derniers mois
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLastDays(undefined)}
              >
                Tout
              </Button>
            </ButtonGroup>
            <Calendar
              mode="range"
              locale={frDP}
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangePicker;
