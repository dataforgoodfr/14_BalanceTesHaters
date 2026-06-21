import { test, expect } from "./fixtures";
import { youtubeShortUrl } from "./scraping/youtube/youtubeShortUrl";
import { flattenComments } from "./utils/flattenComments";
import { e2eScrapPost, E2EScrapPostResult } from "./scraping/e2eScrapPost";
import { openAndPrepareYoutubeShortsPage } from "./scraping/youtube/openAndPrepareYoutubeShortsPage";

test.describe("Youtube Shorts Scraping", () => {
  test.use({ locale: "fr-FR" });

  test("Test scraping short public without authentication", async ({
    extensionId,
    context,
  }, testInfo) => {
    test.skip(
      !!process.env.CI,
      "Skipped in CI because blocked by youtube in CI",
    );

    const youtubeShortId = "WPpURgqzXZ4";
    const postUrl = youtubeShortUrl(youtubeShortId);

    const { postSnapshot: post }: E2EScrapPostResult = await e2eScrapPost({
      postUrl,
      openAndPreparePage: openAndPrepareYoutubeShortsPage,
      context,
      extensionId,
      testInfo,
    });

    expect(post.postId).toEqual(youtubeShortId);
    expect(post.url).toEqual(postUrl);
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
