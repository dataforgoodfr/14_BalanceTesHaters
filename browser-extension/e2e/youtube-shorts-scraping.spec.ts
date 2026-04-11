import { test, expect } from "./fixtures";
import {
  triggerYoutubeScrapingForUrl,
  youtubeShortUrl,
} from "./utils/triggerYoutubeVideoScraping";

test.describe("Youtube Shorts Scraping", () => {
  test.use({ locale: "fr-FR" });

  test("Test scraping short public without authentication", async ({
    extensionId,
    context,
  }) => {
    test.setTimeout(60_000);

    const youtubeShortId = "pu3WUIxeVrY";
    const postUrl = youtubeShortUrl(youtubeShortId);

    const triggerResult = await triggerYoutubeScrapingForUrl(
      extensionId,
      context,
      postUrl,
    );

    expect(triggerResult.postUrl).toEqual(postUrl);
    expect(triggerResult.scrapingStarted).toBeTruthy();
    expect(triggerResult.postTabId).toBeGreaterThan(0);

    // This short currently exposes comments without authentication.
    const shortCommentControls = await triggerResult.postPage
      .locator(
        'div[role="button"][aria-label*="comment" i], button[aria-label*="comment" i]',
      )
      .count();
    expect(shortCommentControls).toBeGreaterThan(0);
  });
});
