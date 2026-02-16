import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { PublicationDate, RelativeDate } from "@/shared/model/post";

export default function DisplayPublicationDate({
  date: at,
}: {
  date: PublicationDate;
}) {
  return (
    <>
      {at.type === "absolute" ? (
        <Tooltip>
          <TooltipTrigger>{formatDate(at.date)}</TooltipTrigger>
          <TooltipContent>{formatDateTime(at.date)}</TooltipContent>
        </Tooltip>
      ) : at.type === "relative" ? (
        <DisplayRelativeDate at={at} />
      ) : (
        <span>Date non reconnue: {at.dateText}</span>
      )}
    </>
  );
}

function DisplayRelativeDate({ at: relativeDate }: { at: RelativeDate }) {
  const midDateFormat = midDate(
    new Date(relativeDate.resolvedDateRange.start),
    new Date(relativeDate.resolvedDateRange.end),
  ).toLocaleDateString();
  const approximateDateFormat = `~${midDateFormat}`;
  const start = formatDateTime(relativeDate.resolvedDateRange.start);
  const end = formatDateTime(relativeDate.resolvedDateRange.end);
  const rangeFormat = `Date approximative entre ${start} et ${end}`;
  return (
    <Tooltip>
      <TooltipTrigger>{approximateDateFormat}</TooltipTrigger>
      <TooltipContent>{rangeFormat}</TooltipContent>
    </Tooltip>
  );
}

function midDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.round((end.getTime() - start.getTime()) / 2),
  );
}

function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString();
}
