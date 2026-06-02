import { test, expect } from "./fixtures";
import { waitForPostStored } from "./utils/waitForPostStored";
import {
  triggerYoutubeScrapingForUrl,
  youtubeShortUrl,
} from "./utils/youtube/triggerYoutubeVideoScraping";
import { flattenComments } from "./flattenComments";

test.describe("Youtube Shorts Scraping", () => {
  test.use({ locale: "fr-FR" });

  test("Test scraping short public without authentication", async ({
    extensionId,
    context,
  }) => {
    test.skip(!!process.env.CI, "Skipped in CI because bloqued by youtube");
    test.setTimeout(60_000);

    const youtubeShortId = "WPpURgqzXZ4";
    const postUrl = youtubeShortUrl(youtubeShortId);

    const triggerResult = await triggerYoutubeScrapingForUrl(
      extensionId,
      context,
      postUrl,
    );

    expect(triggerResult.postUrl).toEqual(postUrl);
    expect(triggerResult.scrapingStarted).toBeTruthy();

    // Wait for analysis to end
    const scrapTimeout = 60 * 1000;
    test.setTimeout(scrapTimeout);

    const post = await waitForPostStored(context, youtubeShortId, scrapTimeout);

    expect(post.postId).toEqual(youtubeShortId);
    expect(post.url).toEqual(triggerResult.postUrl);
    expect(post.publishedAt).toEqual({
      type: "absolute",
      date: "2025-02-19T17:00:41.000Z",
    });
    expect(new Date(post.scrapedAt).getTime()).toBeLessThan(Date.now());

    // Check comments
    const topLevelComments = post.comments;
    const firstLevelReplies = topLevelComments.flatMap((c) => c.replies);

    const allComments = flattenComments(topLevelComments);

    // Ensure have top level comments
    expect(topLevelComments.length).toBeGreaterThan(0);
    // Ensure have replies
    expect(firstLevelReplies.length).toBeGreaterThan(0);

    // Test all comment have commentId
    expect(allComments.every((comment) => comment.commentId !== null)).toBe(
      true,
    );

    // Test all comments have text
    expect(allComments.every((comment) => comment.textContent.length > 0)).toBe(
      true,
    );
    // Test all comments have screenshotData
    expect(
      allComments.every((comment) => comment.screenshotData.length > 0),
    ).toBe(true);
  });
});
