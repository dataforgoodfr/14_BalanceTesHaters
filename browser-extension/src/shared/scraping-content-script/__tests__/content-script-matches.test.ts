import { describe, expect, it } from "vitest";
import { matchesScrapingContentScriptUrl } from "../content-script-matches";

describe("matchesScrapingContentScriptUrl", () => {
  it("matches urls where a scraping content script is registered", () => {
    expect(
      matchesScrapingContentScriptUrl("https://www.youtube.com/watch?v=abc"),
    ).toBe(true);
    expect(
      matchesScrapingContentScriptUrl("https://www.instagram.com/p/abc"),
    ).toBe(true);
  });

  it("does not match urls without a scraping content script", () => {
    expect(matchesScrapingContentScriptUrl("https://example.com")).toBe(false);
    expect(matchesScrapingContentScriptUrl("chrome://extensions")).toBe(false);
    expect(matchesScrapingContentScriptUrl(undefined)).toBe(false);
  });
});
