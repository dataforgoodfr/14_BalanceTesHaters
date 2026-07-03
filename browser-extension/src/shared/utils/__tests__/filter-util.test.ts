import { describe, it, expect } from "vitest";
import {
  isCategoryFiltered,
  isSelectedOption,
  toggleFilterValue,
} from "../filter-util";

type ExampleFilters = {
  tags: string[];
  status: string | undefined;
};

describe("filter utilities", () => {
  describe("toggleFilterValue", () => {
    it("should add a value to a multi-select category", () => {
      const filters: ExampleFilters = {
        tags: ["urgent"],
        status: undefined,
      };

      const result = toggleFilterValue(filters, "tags", "important");

      expect(result.tags).toEqual(["urgent", "important"]);
      expect(result.status).toBeUndefined();
    });

    it("should remove a value from a multi-select category when already selected", () => {
      const filters: ExampleFilters = {
        tags: ["urgent", "important"],
        status: undefined,
      };

      const result = toggleFilterValue(filters, "tags", "urgent");

      expect(result.tags).toEqual(["important"]);
      expect(result.status).toBeUndefined();
    });

    it("should set a single-select category when selecting a new value", () => {
      const filters: ExampleFilters = {
        tags: [],
        status: undefined,
      };

      const result = toggleFilterValue(filters, "status", "open");

      expect(result.status).toBe("open");
      expect(result.tags).toEqual([]);
    });

    it("should clear a single-select category when selecting the same value again", () => {
      const filters: ExampleFilters = {
        tags: [],
        status: "open",
      };

      const result = toggleFilterValue(filters, "status", "open");

      expect(result.status).toBeUndefined();
      expect(result.tags).toEqual([]);
    });

    it("should preserve other categories when toggling a category", () => {
      const filters: ExampleFilters = {
        tags: ["urgent"],
        status: "open",
      };

      const result = toggleFilterValue(filters, "tags", "important");

      expect(result.tags).toEqual(["urgent", "important"]);
      expect(result.status).toBe("open");
    });
  });

  describe("isCategoryFiltered", () => {
    it("should return false for undefined values", () => {
      expect(isCategoryFiltered(undefined)).toBe(false);
    });

    it("should return false for empty arrays", () => {
      expect(isCategoryFiltered([])).toBe(false);
    });

    it("should return true for non-empty arrays", () => {
      expect(isCategoryFiltered(["tag"])).toBe(true);
    });

    it("should return true for defined string values", () => {
      expect(isCategoryFiltered("open")).toBe(true);
    });
  });

  describe("isSelectedOption", () => {
    it("should return true when the option is present in an array category", () => {
      const filters: ExampleFilters = {
        tags: ["urgent", "important"],
        status: undefined,
      };

      expect(isSelectedOption(filters, "tags", "important")).toBe(true);
    });

    it("should return false when the option is absent from an array category", () => {
      const filters: ExampleFilters = {
        tags: ["urgent"],
        status: undefined,
      };

      expect(isSelectedOption(filters, "tags", "important")).toBe(false);
    });

    it("should return true when the single-select category matches the option", () => {
      const filters: ExampleFilters = {
        tags: [],
        status: "open",
      };

      expect(isSelectedOption(filters, "status", "open")).toBe(true);
    });

    it("should return false when the single-select category differs from the option", () => {
      const filters: ExampleFilters = {
        tags: [],
        status: "closed",
      };

      expect(isSelectedOption(filters, "status", "open")).toBe(false);
    });
  });
});
