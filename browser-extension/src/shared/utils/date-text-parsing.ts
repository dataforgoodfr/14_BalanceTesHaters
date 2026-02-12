import { PublicationDate } from "../model/post";

type Language = "fr" | "en";
type TimeUnit = "year" | "month" | "week" | "day" | "hour" | "minute";

export class PublicationDateTextParsing {
  constructor(
    private readonly dateText: string,
    private readonly baseDate = new Date(),
  ) { }

  parse(): PublicationDate {
    const parseAttempt = new Date(this.dateText);
    if (this.isValidDate(parseAttempt)) {
      return {
        type: "absolute",
        date: parseAttempt.toISOString(),
      };
    }
    if (
      this.language === "unknown" ||
      this.timeAmount === "unknown" ||
      this.timeUnit === "unknown"
    ) {
      return { type: "unknown date" };
    }

    const resolvedDateRange = this.computeDateRange(
      this.timeAmount,
      this.timeUnit,
    );

    return {
      type: "relative",
      dateText: this.dateText,
      resolvedDateRange,
    };
  }

  private isValidDate(date: Date): boolean {
    return !isNaN(date.getTime());
  }

  private get language(): Language | "unknown" {
    if (/.*ago$/.test(this.dateText)) {
      return "en";
    }
    if (/^il y a.*/.test(this.dateText)) {
      return "fr";
    }
    return "unknown";
  }

  private get timeUnit(): TimeUnit | "unknown" {
    const timeUnitsDictionnary: Record<TimeUnit, RegExp> = {
      year: /year|an/,
      month: /month|mois/,
      week: /week|semaine/,
      day: /day|jour/,
      hour: /hour|heure/,
      minute: /minute/,
    };
    return (
      (Object.entries(timeUnitsDictionnary).find(([_, regExp]) =>
        regExp.test(this.dateText),
      )?.[0] as TimeUnit) ?? "unknown"
    );
  }

  private get timeAmount(): number | "unknown" {
    const parseAttempt = parseInt(/\d+/.exec(this.dateText)?.[0] ?? "", 10);
    if (isNaN(parseAttempt)) {
      return "unknown";
    }
    return parseAttempt;
  }
  computeDateRange(
    timeAmount: number,
    timeUnit: TimeUnit,
  ): { start: string; end: string } {
    switch (timeUnit) {
      case "year":
        return {
          start: new Date(
            new Date(this.baseDate).setFullYear(
              this.baseDate.getFullYear() - timeAmount - 1,
            ),
          ).toISOString(),
          end: new Date(
            new Date(this.baseDate).setFullYear(
              this.baseDate.getFullYear() - timeAmount,
            ),
          ).toISOString(),
        };
      case "month":
        return {
          start: new Date(
            new Date(this.baseDate).setMonth(
              this.baseDate.getMonth() - timeAmount - 1,
            ),
          ).toISOString(),
          end: new Date(
            new Date(this.baseDate).setMonth(
              this.baseDate.getMonth() - timeAmount,
            ),
          ).toISOString(),
        };
      case "week":
        return {
          start: new Date(
            new Date(this.baseDate).setDate(
              this.baseDate.getDate() - timeAmount * 7 - 7,
            ),
          ).toISOString(),
          end: new Date(
            new Date(this.baseDate).setDate(
              this.baseDate.getDate() - timeAmount * 7,
            ),
          ).toISOString(),
        };
      case "day":
        return {
          start: new Date(
            new Date(this.baseDate).setDate(
              this.baseDate.getDate() - timeAmount,
            ),
          ).toISOString(),
          end: new Date(
            new Date(this.baseDate).setDate(
              this.baseDate.getDate() - timeAmount + 1,
            ),
          ).toISOString(),
        };
      case "hour":
        return {
          start: new Date(
            new Date(this.baseDate).setHours(
              this.baseDate.getHours() - timeAmount - 1,
            ),
          ).toISOString(),
          end: new Date(
            new Date(this.baseDate).setHours(
              this.baseDate.getHours() - timeAmount,
            ),
          ).toISOString(),
        };
      case "minute":
        return {
          start: new Date(
            new Date(this.baseDate).setMinutes(
              this.baseDate.getMinutes() - timeAmount - 1,
            ),
          ).toISOString(),
          end: new Date(
            new Date(this.baseDate).setMinutes(
              this.baseDate.getMinutes() - timeAmount,
            ),
          ).toISOString(),
        };
      default:
        throw new Error("Could not compute date range");
    }
  }
}
