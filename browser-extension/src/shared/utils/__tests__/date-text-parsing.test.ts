import { describe, it, expect } from "vitest";
import { PublicationDateTextParsing } from "../date-text-parsing";
import { PublicationDate } from "@/shared/model/post";

describe("Date conversion from text", () => {
  describe("Parse to unknown date", () => {
    it("Should convert an empty string to date of type unknown", () => {
      const result: PublicationDate = new PublicationDateTextParsing(
        "",
        new Date("2026-02-11"),
      ).parse();
      expect(result.type).toBe("unknown date");
    });
    it("Should convert text to unknown date if language is unknown", () => {
      const result: PublicationDate = new PublicationDateTextParsing(
        "Vor 2 wochen",
      ).parse();
      expect(result.type).toBe("unknown date");
    });
    it("Should return unknown date if the dateText is not parsable", () => {
      const text = "1 ¨%µ£¨¹ ago";
      const result: PublicationDate = new PublicationDateTextParsing(
        text,
      ).parse();
      expect(result).toStrictEqual({
        type: "unknown date",
        dateText: text,
      });
    });
  });

  describe("Parse to absolute date if formatted", () => {
    it("Should convert date time string to date of type absolute ", () => {
      const result: PublicationDate = new PublicationDateTextParsing(
        "2026-02-11T15:00:56.214Z",
      ).parse();
      expect(result.type).toBe("absolute");
    });
    it("Should convert text to relative if in french like 'il y a 1 mois'", () => {
      const result: PublicationDate = new PublicationDateTextParsing(
        "il y a 1 mois",
      ).parse();
      expect(result.type).toBe("relative");
    });
    it("Should convert text to relative if in english like '1 month ago'", () => {
      const result: PublicationDate = new PublicationDateTextParsing(
        "1 month ago",
      ).parse();
      expect(result.type).toBe("relative");
    });
    it("Should convert date time string to date of type absolute with right value", () => {
      const result: PublicationDate = new PublicationDateTextParsing(
        "2026-02-11T15:00:56.214Z",
      ).parse();
      expect(result).toStrictEqual({
        type: "absolute",
        date: "2026-02-11T15:00:56.214Z",
      });
    });
  });

  describe("Parsing relative dates in french and english", () => {
    it.each([
      {
        unit: "years",
        language: "english",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "2 years ago",
        expected: {
          resolvedDateRange: {
            start: "2023-02-11T00:00:00.000Z",
            end: "2024-02-11T00:00:00.000Z",
          },
        },
      },
      {
        unit: "years",
        language: "french",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "il y a 2 ans",
        expected: {
          resolvedDateRange: {
            start: "2023-02-11T00:00:00.000Z",
            end: "2024-02-11T00:00:00.000Z",
          },
        },
      },
      {
        unit: "months",
        language: "english",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "1 month ago",
        expected: {
          resolvedDateRange: {
            start: "2025-12-11T00:00:00.000Z",
            end: "2026-01-11T00:00:00.000Z",
          },
        },
      },
      {
        unit: "months",
        language: "french",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "il y a 1 mois",
        expected: {
          resolvedDateRange: {
            start: "2025-12-11T00:00:00.000Z",
            end: "2026-01-11T00:00:00.000Z",
          },
        },
      },
      {
        unit: "weeks",
        language: "english",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "3 weeks ago",
        expected: {
          resolvedDateRange: {
            start: "2026-01-14T00:00:00.000Z",
            end: "2026-01-21T00:00:00.000Z",
          },
        },
      },
      {
        unit: "weeks",
        language: "french",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "il y a 3 semaines",
        expected: {
          resolvedDateRange: {
            start: "2026-01-14T00:00:00.000Z",
            end: "2026-01-21T00:00:00.000Z",
          },
        },
      },
      {
        unit: "days",
        language: "english",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "11 days ago",
        expected: {
          resolvedDateRange: {
            start: "2026-01-31T00:00:00.000Z",
            end: "2026-02-01T00:00:00.000Z",
          },
        },
      },
      {
        unit: "days",
        language: "french",
        date: new Date("2026-02-11T00:00:00.000Z"),
        textDate: "il y a 11 jours",
        expected: {
          resolvedDateRange: {
            start: "2026-01-31T00:00:00.000Z",
            end: "2026-02-01T00:00:00.000Z",
          },
        },
      },
      {
        unit: "hours",
        language: "english",
        date: new Date("2026-02-11T15:17:00.000Z"),
        textDate: "3 hours ago",
        expected: {
          resolvedDateRange: {
            start: "2026-02-11T11:17:00.000Z",
            end: "2026-02-11T12:17:00.000Z",
          },
        },
      },
      {
        unit: "hours",
        language: "french",
        date: new Date("2026-02-11T15:17:00.000Z"),
        textDate: "il y a 3 heures",
        expected: {
          resolvedDateRange: {
            start: "2026-02-11T11:17:00.000Z",
            end: "2026-02-11T12:17:00.000Z",
          },
        },
      },
      {
        unit: "minutes",
        language: "english",
        date: new Date("2026-02-11T15:17:13.000Z"),
        textDate: "24 minutes ago",
        expected: {
          resolvedDateRange: {
            start: "2026-02-11T14:52:13.000Z",
            end: "2026-02-11T14:53:13.000Z",
          },
        },
      },
      {
        unit: "minutes",
        language: "french",
        date: new Date("2026-02-11T15:17:13.000Z"),
        textDate: "il y a 24 minutes",
        expected: {
          resolvedDateRange: {
            start: "2026-02-11T14:52:13.000Z",
            end: "2026-02-11T14:53:13.000Z",
          },
        },
      },
    ])("Parse $unit in $language", ({ date, textDate: dateText, expected }) => {
      const result: PublicationDate = new PublicationDateTextParsing(
        dateText,
        date,
      ).parse();
      expect(result).toStrictEqual({
        ...expected,
        dateText,
        type: "relative" as const,
      });
    });
  });
});
