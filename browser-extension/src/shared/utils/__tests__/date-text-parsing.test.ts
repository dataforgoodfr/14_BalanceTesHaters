import { describe, it, expect } from "vitest";
import { PublicationDateTextParsing } from "../date-text-parsing";
import { PublicationDate } from "@/shared/model/post";

describe("Date conversion from text to ISO", () => {
  it("Should convert an empty string to date of type unknown", () => {
    const result: PublicationDate = new PublicationDateTextParsing(
      "",
      new Date("2026-02-11"),
    ).parse();
    expect(result.type).toBe("unknown date");
  });
  it("Should convert date time string to date of type absolute ", () => {
    const result: PublicationDate = new PublicationDateTextParsing(
      "2026-02-11T15:00:56.214Z",
    ).parse();
    expect(result.type).toBe("absolute");
  });
  it("Should convert text to unknown date if language is unknown", () => {
    const result: PublicationDate = new PublicationDateTextParsing(
      "Vor 2 wochen",
    ).parse();
    expect(result.type).toBe("unknown date");
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
  it("Should return unknown date if the dateText is not parsable", () => {
    const result: PublicationDate = new PublicationDateTextParsing(
      "1 ¨%µ£¨¹ ago",
    ).parse();
    expect(result).toStrictEqual({
      type: "unknown date",
    });
  });
  it("Should compute a range for relative date with months", () => {
    const result: PublicationDate = new PublicationDateTextParsing(
      "1 month ago",
      new Date("2026-02-11"),
    ).parse();
    expect(result).toStrictEqual<PublicationDate>({
      type: "relative",
      dateText: "1 month ago",
      resolvedDateRange: {
        start: "2025-12-11T00:00:00.000Z",
        end: "2026-01-11T00:00:00.000Z",
      },
    });
  });
  it("Should compute a range for relative date with weeks", () => {
    const result: PublicationDate = new PublicationDateTextParsing(
      "3 weeks ago",
      new Date("2026-02-11"),
    ).parse();
    expect(result).toStrictEqual<PublicationDate>({
      type: "relative",
      dateText: "3 weeks ago",
      resolvedDateRange: {
        start: "2026-01-14T00:00:00.000Z",
        end: "2026-01-21T00:00:00.000Z",
      },
    });
  });
  it("Should compute a range for relative date with days", () => {
    const result: PublicationDate = new PublicationDateTextParsing(
      "11 days ago",
      new Date("2026-02-11"),
    ).parse();
    expect(result).toStrictEqual<PublicationDate>({
      type: "relative",
      dateText: "11 days ago",
      resolvedDateRange: {
        start: "2026-01-31T00:00:00.000Z",
        end: "2026-02-01T00:00:00.000Z",
      },
    });
  });
  // TODO for hours and minutes it should just return absolute date of the capture
});
