// @vitest-environment happy-dom

import { describe, expect, test } from "vitest";
import { YoutubeScraper } from "../YoutubeScraper";

describe("YoutubeScraper", () => {
  test("redirects Shorts to the equivalent watch URL", async () => {
    Object.defineProperty(document, "URL", {
      configurable: true,
      value: "https://www.youtube.com/shorts/test-short-id",
    });

    const result = await new YoutubeScraper().scrapPagePost(
      new AbortController().signal,
      undefined!,
    );

    expect(result).toEqual({
      redirectUrl: "https://www.youtube.com/watch?v=test-short-id",
    });
  });
});
