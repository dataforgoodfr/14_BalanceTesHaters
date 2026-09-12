// @vitest-environment happy-dom

import { describe, expect, test } from "vitest";
import { YoutubeScraper } from "../YoutubeScraper";

describe("YoutubeScraper", () => {
  test("reloads the page when og:url is not available yet", async () => {
    document.head.innerHTML = "";

    const result = await new YoutubeScraper(false).scrapPagePost(
      new AbortController().signal,
      undefined!,
    );

    expect(result).toEqual({ redirectUrl: document.URL });
  });
});
