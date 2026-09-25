import { describe, expect, it } from "vitest";
import { formatStatusWithEmoji } from "../formatMarkdownValue";

describe("formatStatusWithEmoji", () => {
  it("adds a readable marker to each status category", () => {
    expect(formatStatusWithEmoji("success")).toBe("🟢 success");
    expect(formatStatusWithEmoji("warning")).toBe("🟠 warning");
    expect(formatStatusWithEmoji("running")).toBe("▶️ running");
    expect(formatStatusWithEmoji("waiting")).toBe("⏳ waiting");
    expect(formatStatusWithEmoji("stalled")).toBe("🔴 stalled");
  });
});
