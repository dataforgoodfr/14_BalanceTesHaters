import { describe, it, expect } from "vitest";
import { getFirstDayOfWeek } from "../date-util";

describe("date utilities", () => {
  describe("getFirstDayOfWeek", () => {
    it("should get the first day of the week for a Thursday", () => {
      const date = new Date("2026-01-01");

      const result = getFirstDayOfWeek(date);
      expect(result.toLocaleDateString()).toBe(new Date("2025-12-29").toLocaleDateString());
    });

    it("should get the first day of the week for a Monday", () => {
      const date = new Date("2026-01-05");

      const result = getFirstDayOfWeek(date);
      expect(result.toLocaleDateString()).toBe(new Date("2026-01-05").toLocaleDateString());
    });
  });
});
