// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { InstagramScraper } from "../InstagramScraper";

describe("InstagramScraper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("reloads the page when og:url is not available yet", async () => {
    vi.stubGlobal("document", {
      URL: "https://www.instagram.com/p/ABC123/",
      querySelectorAll: () => [],
    });

    const result = await new InstagramScraper().scrapPagePost(
      new AbortController().signal,
      undefined!,
    );

    expect(result).toEqual({
      redirectUrl: "https://www.instagram.com/p/ABC123/",
    });
  });
});
