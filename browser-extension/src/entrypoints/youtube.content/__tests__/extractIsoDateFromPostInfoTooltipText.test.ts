import { describe, it, expect } from "vitest";
import { extractIsoDateFromPostInfoTooltipText } from "../extractIsoDateFromPostInfoTooltipText";

describe("extractIsoDateFromPostInfoTooltipText", () => {
  describe("It should parse tooltip primary format", () => {
    it("should extract ISO date from valid tooltip text with French locale", () => {
      const tooltipText = "20 330 vues • 18 janv. 2026 • #tag1 #tag2 #arte";
      const result = extractIsoDateFromPostInfoTooltipText(tooltipText);
      expect(result).toBe("2026-01-18T00:00:00.000Z");
    });

    it("should extract ISO date from tooltip text with full English local", () => {
      const tooltipText = "50 000 views • Jan 18, 2025 • #tag1 #tag2 #arte";
      const result = extractIsoDateFromPostInfoTooltipText(tooltipText);
      expect(result).toBe("2025-01-18T00:00:00.000Z");
    });

    it("should extract ISO date with different date", () => {
      const tooltipText = "1 234 vues • 15 mars 2024 • #test";
      const result = extractIsoDateFromPostInfoTooltipText(tooltipText);
      expect(result).toBe("2024-03-15T00:00:00.000Z");
    });

    it("should extract 4 juin 2024 date", () => {
      expect(
        extractIsoDateFromPostInfoTooltipText(
          "22 116 vues • 4 juin 2024 • #Festin",
        ),
      ).toBe("2024-06-04T00:00:00.000Z");
    });
  });

  describe("It should parse tooltip with premiered format", () => {
    // Example of video using "premiered" format https://www.youtube.com/watch?v=H7oc4uS0C7Y
    it("premiered format in english", () => {
      const tooltipText = "1,720,123 views • Premiered Jan 28, 2022";
      const result = extractIsoDateFromPostInfoTooltipText(tooltipText);
      expect(result).toBe("2022-01-28T00:00:00.000Z");
    });
    it("premiered format in french", () => {
      const tooltipText = "1 720 138 vues • Sortie le 28 janv. 2022";
      const result = extractIsoDateFromPostInfoTooltipText(tooltipText);
      expect(result).toBe("2022-01-28T00:00:00.000Z");
    });
  });

  it("should extract 4 juin 2024 date", () => {
    expect(
      extractIsoDateFromPostInfoTooltipText(
        "22 116 vues • 4 juin 2024 • #Festin",
      ),
    ).toBe("2024-06-04T00:00:00.000Z");
  });

  it("should throw error when tooltip doesn't have bullet separators", () => {
    const tooltipText = "20 330 vues";
    expect(() => extractIsoDateFromPostInfoTooltipText(tooltipText)).toThrow(
      "Cannot parse tooltip - missing fragments: 20 330 vues",
    );
  });

  it("should throw when date is not valid", () => {
    const tooltipText = "100 views • not a date • #test";
    expect(() => extractIsoDateFromPostInfoTooltipText(tooltipText)).toThrow(
      "Cannot parse tooltip - date fragment is invalid: 100 views • not a date • #test",
    );
  });
});
