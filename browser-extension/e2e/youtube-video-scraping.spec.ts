import { test, expect } from "./fixtures";
import { waitForPostStored } from "./utils/waitForPostStored";
import { triggerYoutubeVideoScraping } from "./utils/triggerYoutubeVideoScraping";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";

["en-US", "fr-FR"].forEach((locale) => {
  test.describe("Youtube Video Scraping with Locale:" + locale, () => {
    test.use({ locale: locale });

    test(`Test scraping video locale:${locale}`, async ({
      extensionId,
      context,
    }) => {
      const emptyPage = await context.newPage();
      const navLanguage = await emptyPage.evaluate(() => {
        console.log("language: " + navigator.language);
        return navigator.language;
      });
      expect(navLanguage).toBe(locale);

      // Note: the scraping part (until the waitForPostStored)
      // should ideally be moved to a beforeAll
      // However this requires to figure out how to
      //  install extension before the beforeAll...
      const youtubeVideoId = "bYnBcdxT7os";

      const triggerResult = await triggerYoutubeVideoScraping(
        extensionId,
        context,
        youtubeVideoId,
      );

      // Wait for analysis to end
      const scrapTimeout = 8 * 60 * 1000;
      test.setTimeout(scrapTimeout);

      const post = await waitForPostStored(
        context,
        youtubeVideoId,
        scrapTimeout,
      );

      // Test post values
      expect(post.postId).toEqual(youtubeVideoId);
      expect(post.url).toEqual(triggerResult.postUrl);
      expect(post.publishedAt).toEqual({
        type: "absolute",
        date: "2025-07-22T00:00:00.000Z",
      });
      expect(new Date(post.scrapedAt).getTime()).toBeLessThan(Date.now());

      // Check comments
      const topLevelComments = post.comments;
      const allComments = flatten(topLevelComments);
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
      const commentCountElement = await triggerResult.postPage.$(
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

function flatten(comments: CommentSnapshot[]): CommentSnapshot[] {
  return [...comments, ...comments.flatMap((c) => flatten(c.replies))];
}
