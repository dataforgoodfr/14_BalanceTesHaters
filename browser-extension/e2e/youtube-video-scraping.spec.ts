import { test, expect } from "./fixtures";
import { flattenComments } from "./utils/flattenComments";
import { youtubeVideoUrl } from "./scraping/youtube/youtubeVideoUrl";
import { e2eScrapPost, E2EScrapPostResult } from "./scraping/e2eScrapPost";
import { openAndPrepareYoutubeVideoPage } from "./scraping/youtube/openAndPrepareYoutubeVideoPage";

["en-US", "fr-FR"].forEach((locale) => {
  test.describe("Youtube Video Scraping with Locale:" + locale, () => {
    test.use({ locale: locale });

    test(`Test scraping video locale:${locale}`, async ({
      extensionId,
      context,
    }, testInfo) => {
      // Note: the scraping part (until the waitForPostStored)
      // should ideally be moved to a beforeAll
      // However this requires to figure out how to
      //  install extension before the beforeAll...
      const youtubeVideoId = "bYnBcdxT7os";
      const postUrl = youtubeVideoUrl(youtubeVideoId);

      const { postSnapshot: post, postPage }: E2EScrapPostResult =
        await e2eScrapPost({
          postUrl,
          openAndPreparePage: openAndPrepareYoutubeVideoPage,
          context,
          extensionId,
          testInfo,
        });

      // Test post values
      expect(post.postId).toEqual(youtubeVideoId);
      expect(post.url).toEqual(postUrl);
      expect(post.publishedAt).toEqual({
        type: "absolute",
        date: "2025-07-22T00:00:00.000Z",
      });
      expect(new Date(post.scrapedAt).getTime()).toBeLessThan(Date.now());

      // Check comments
      const topLevelComments = post.comments;
      const allComments = flattenComments(topLevelComments);
      expect(topLevelComments.length).toBeGreaterThan(0);
      expect(allComments.length).toBeGreaterThan(0);

      // Test commentId captured
      const commentForId = topLevelComments.find(
        (c) => typeof c.commentId === "string" && c.commentId.length > 10,
      );
      expect(commentForId).toBeDefined();
      expect(commentForId?.commentId).toMatch(/^[a-zA-Z0-9_-]+$/);

      // Test emojis are captured on at least one comment
      const commentWithEmojis = topLevelComments.find((c) =>
        /\p{Extended_Pictographic}/u.test(c.textContent),
      );
      expect(commentWithEmojis).toBeDefined();

      // Test long comment is captured
      const longComment = topLevelComments.find(
        (c) => c.textContent.length > 80,
      );
      expect(longComment).toBeDefined();
      expect(longComment?.textContent.length).toBeGreaterThan(80);

      // Test likes parsing is present on top-level comments
      expect(topLevelComments.every((comment) => comment.nbLikes >= 0)).toBe(
        true,
      );

      // Replies can change over time on public videos. If any reply exists,
      // assert its text has been captured.
      const firstReply = topLevelComments.find((c) => c.replies.length > 0)
        ?.replies[0];
      if (firstReply) {
        expect(firstReply.textContent.length).toBeGreaterThan(0);
      }

      // Test that total scraped comment count matches youtube displayed count
      const commentCountElement = await postPage.$(
        "#comments #count span:nth-of-type(1)",
      );
      const text = (await commentCountElement?.innerText()) || "0";
      const commentCount = Number.parseInt(text);
      expect(allComments.length).toBeLessThanOrEqual(commentCount);
      expect(allComments.length).toBeGreaterThanOrEqual(
        Math.floor(commentCount * 0.7),
      );
    });
  });
});
