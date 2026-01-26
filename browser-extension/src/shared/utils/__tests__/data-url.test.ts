import { describe, it, expect } from "vitest";
import { buildDataUrl, extractBase64DataFromDataUrl } from "../data-url";

describe("data-url utilities", () => {
  describe("buildDataUrl", () => {
    it("should construct a valid data URL", () => {
      const base64Data = "SGVsbG8gV29ybGQ=";
      const mimeType = "text/plain";
      const result = buildDataUrl(base64Data, mimeType);
      expect(result).toBe("data:text/plain;base64,SGVsbG8gV29ybGQ=");
    });
  });

  describe("extractBase64DataFromDataUrl", () => {
    it("should extract base64 data from a valid data URL", () => {
      const dataUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
      const result = extractBase64DataFromDataUrl(dataUrl);
      expect(result).toBe("SGVsbG8gV29ybGQ=");
    });

    it("should throw an error for invalid data URL", () => {
      const invalidDataUrl = "invalid-url";
      expect(() => extractBase64DataFromDataUrl(invalidDataUrl)).toThrow(
        "invalid data URL",
      );
    });
  });
});
