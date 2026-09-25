import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatPercentage,
  formatStatusWithEmoji,
} from "../formatMarkdownValue";

describe("formatMarkdownValue", () => {
  it("formats resource usage", () => {
    expect(formatBytes(120 * 1024 * 1024)).toBe("120.0 MiB");
    expect(formatBytes(undefined)).toBe("n/a");
    expect(formatPercentage(12.345)).toBe("12.3%");
    expect(formatPercentage(undefined)).toBe("n/a");
  });
});

describe("formatStatusWithEmoji", () => {
  it("adds a readable marker to each status category", () => {
    expect(formatStatusWithEmoji("success")).toBe("🟢 success");
    expect(formatStatusWithEmoji("warning")).toBe("🟠 warning");
    expect(formatStatusWithEmoji("running")).toBe("▶️ running");
    expect(formatStatusWithEmoji("waiting")).toBe("⏳ waiting");
    expect(formatStatusWithEmoji("stalled")).toBe("🔴 stalled");
  });
});
