// @vitest-environment happy-dom

import { describe, expect, test } from "vitest";
import { YoutubeScraper } from "../YoutubeScraper";

describe("YoutubeScraper", () => {
  test("redirects Shorts to the equivalent watch URL", async () => {
    document.documentElement.lang = "fr-FR";
    Object.defineProperty(document, "URL", {
      configurable: true,
      value: "https://www.youtube.com/shorts/test-short-id",
    });

    const result = await new YoutubeScraper().scrapPagePost(
      new AbortController().signal,
      undefined!,
      {
        postSnapshotId: crypto.randomUUID(),
        appendScreenshots: () => Promise.resolve(),
      },
    );

    expect(result).toEqual({
      redirectUrl: "https://www.youtube.com/watch?v=test-short-id",
    });
  });

  test("rejects scraping when the YouTube language is unsupported", async () => {
    document.documentElement.lang = "de-DE";
    Object.defineProperty(document, "URL", {
      configurable: true,
      value: "https://www.youtube.com/watch?v=test-video-id",
    });

    await expect(
      new YoutubeScraper().scrapPagePost(
        new AbortController().signal,
        undefined!,
        {
          postSnapshotId: crypto.randomUUID(),
          appendScreenshots: () => Promise.resolve(),
        },
      ),
    ).rejects.toThrow(
      "La langue actuelle de YouTube (de-DE) n'est pas prise en charge.",
    );
  });
});
