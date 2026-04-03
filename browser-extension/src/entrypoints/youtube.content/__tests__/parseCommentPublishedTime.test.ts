import { describe, it, expect } from "vitest";
import { parseCommentPublishedTime } from "../parseCommentPublishedTime";

describe("parseCommentPublishedTime", () => {
  const baseDate = new Date("2026-03-10T00:00:00.000Z");

  it("should parse relative date in English", () => {
    const result = parseCommentPublishedTime("3 days ago", baseDate);
    expect(result).toEqual({
      type: "relative",
      dateText: "3 days ago",
      resolvedDateRange: {
        start: new Date("2026-03-07T00:00:00.000Z").toISOString(),
        end: new Date("2026-03-08T00:00:00.000Z").toISOString(),
      },
    });
  });

  it("should parse relative date in French", () => {
    const result = parseCommentPublishedTime("il y a 2 mois", baseDate);
    expect(result).toEqual({
      type: "relative",
      dateText: "il y a 2 mois",
      resolvedDateRange: {
        start: new Date("2025-12-10T00:00:00.000Z").toISOString(),
        end: new Date("2026-01-10T00:00:00.000Z").toISOString(),
      },
    });
  });

  it("should handle edited comments in English", () => {
    const result = parseCommentPublishedTime("5 hours ago (edited)", baseDate);
    expect(result).toEqual({
      type: "relative",
      dateText: "5 hours ago",
      resolvedDateRange: {
        start: new Date("2026-03-09T18:00:00.000Z").toISOString(),
        end: new Date("2026-03-09T19:00:00.000Z").toISOString(),
      },
    });
  });

  it("should handle edited comments in French", () => {
    const result = parseCommentPublishedTime(
      "il y a 1 jour (modifié)",
      baseDate,
    );
    expect(result).toEqual({
      type: "relative",
      dateText: "il y a 1 jour",
      resolvedDateRange: {
        start: new Date("2026-03-09T00:00:00.000Z").toISOString(),
        end: new Date("2026-03-10T00:00:00.000Z").toISOString(),
      },
    });
  });
});
