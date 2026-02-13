import { PublicationDate } from "../model/post";

type Language = "fr" | "en";
type TimeUnit = "year" | "month" | "week" | "day" | "hour" | "minute";

export class PublicationDateTextParsing {
  constructor(
    private readonly dateText: string,
    private readonly baseDate = new Date(),
  ) {}

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
      return {
        type: "unknown date",
        dateText: this.dateText,
      };
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
  private computeDateRange(
    timeAmount: number,
    timeUnit: TimeUnit,
  ): { start: string; end: string } {
    switch (timeUnit) {
      case "year":
        return this.yearRange(timeAmount);
      case "month":
        return this.monthRange(timeAmount);
      case "week":
        return this.weekRange(timeAmount);
      case "day":
        return this.dayRange(timeAmount);
      case "hour":
        return this.hourRange(timeAmount);
      case "minute":
        return this.minuteRange(timeAmount);
    }
  }
  private yearRange(timeAmount: number) {
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
  }
  private monthRange(timeAmount: number) {
    return {
      start: new Date(
        new Date(this.baseDate).setMonth(
          this.baseDate.getMonth() - timeAmount - 1,
        ),
      ).toISOString(),
      end: new Date(
        new Date(this.baseDate).setMonth(this.baseDate.getMonth() - timeAmount),
      ).toISOString(),
    };
  }
  private weekRange(timeAmount: number) {
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
  }
  private dayRange(timeAmount: number) {
    return {
      start: new Date(
        new Date(this.baseDate).setDate(this.baseDate.getDate() - timeAmount),
      ).toISOString(),
      end: new Date(
        new Date(this.baseDate).setDate(
          this.baseDate.getDate() - timeAmount + 1,
        ),
      ).toISOString(),
    };
  }
  private hourRange(timeAmount: number) {
    return {
      start: new Date(
        new Date(this.baseDate).setHours(
          this.baseDate.getHours() - timeAmount - 1,
        ),
      ).toISOString(),
      end: new Date(
        new Date(this.baseDate).setHours(this.baseDate.getHours() - timeAmount),
      ).toISOString(),
    };
  }
  private minuteRange(timeAmount: number) {
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
  }
}
