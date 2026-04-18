import { Post } from "@/shared/model/post/Post";
import { ReportOrganizationType } from "./BuildReport";

export function reportOrganizationTypeToText(
  type: ReportOrganizationType,
): string {
  switch (type) {
    case ReportOrganizationType.BY_PUBLICATION:
      return "Par publication";
    case ReportOrganizationType.BY_AUTHOR:
      return "Par auteur";
  }
}

export function booleanToFrenchText(value: boolean): string {
  return value ? "Oui" : "Non";
}

export function publicationDateTypeToText(
  type: Post["publishedAt"]["type"],
): string {
  switch (type) {
    case "absolute":
      return "Date absolue";
    case "relative":
      return "Date relative";
    case "unknown date":
      return "Date inconnue";
  }
}

export function publicationDateToCsvText(date: Post["publishedAt"]): string {
  switch (date.type) {
    case "absolute":
      return formatDateTimeForCsv(date.date, { dateOnlyIfMidnightUtc: true });
    case "relative":
      return `${date.dateText} (estimé entre ${formatDateTimeForCsv(date.resolvedDateRange.start)} et ${formatDateTimeForCsv(date.resolvedDateRange.end)})`;
    case "unknown date":
      return date.dateText;
  }
}

export function publicationDateToDocxText(date: Post["publishedAt"]): string {
  switch (date.type) {
    case "absolute":
      return formatDateTimeForDocx(date.date);
    case "relative":
      return `${date.dateText} (estimé entre ${formatDateTimeForDocx(date.resolvedDateRange.start)} et ${formatDateTimeForDocx(date.resolvedDateRange.end)})`;
    case "unknown date":
      return date.dateText;
  }
}

export function publicationDateSourceText(date: Post["publishedAt"]): string {
  switch (date.type) {
    case "absolute":
      return date.date;
    case "relative":
      return date.dateText;
    case "unknown date":
      return date.dateText;
  }
}

export function formatDateTimeForCsv(
  value: string,
  options?: { dateOnlyIfMidnightUtc?: boolean },
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const isMidnightUtc =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (options?.dateOnlyIfMidnightUtc && isMidnightUtc) {
    return `UTC ${date.toISOString().slice(0, 10)}`;
  }

  return `UTC ${date.toISOString().slice(0, 19).replace("T", " ")}`;
}

export function formatDateTimeForDocx(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  // Use explicit fields for better browser compatibility than dateStyle/timeStyle
  // mixed with timeZoneName.
  return `${new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(date)} UTC`;
}

export function getPublicationDateRawRange(date: Post["publishedAt"]): {
  start: string;
  end: string;
} {
  switch (date.type) {
    case "absolute":
      return { start: date.date, end: date.date };
    case "relative":
      return {
        start: date.resolvedDateRange.start,
        end: date.resolvedDateRange.end,
      };
    case "unknown date":
      return { start: "", end: "" };
  }
}
