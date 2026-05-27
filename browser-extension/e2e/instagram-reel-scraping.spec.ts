import { test, expect } from "./fixtures";
import { flattenComments } from "./flattenComments";
import {
  instagramReelUrl,
  triggerInstagramScrapingForUrl,
} from "./utils/instagram/triggerInstagramScrapingForUrl";
import { waitForPostStored } from "./utils/waitForPostStored";

["en-US", "fr-FR"].forEach((locale) => {
  test.describe("Scraping reel with Locale:" + locale, () => {
    test.use({ locale: locale });

    test(`Test scraping reel smoke test locale:${locale}`, async ({
      extensionId,
      context,
    }) => {
      const emptyPage = await context.newPage();
      const navLanguage = await emptyPage.evaluate(() => {
        console.log("language: " + navigator.language);
        return navigator.language;
      });
      expect(navLanguage).toBe(locale);

      const reelId = "DX9g-fpCIbF";
      // Note: the scraping part (until the waitForPostStored)
      // should ideally be moved to a beforeAll
      // However this requires to figure out how to
      //  install extension before the beforeAll...

      const url = instagramReelUrl("feministsinthecity", reelId);

      const triggerResult = await triggerInstagramScrapingForUrl(
        extensionId,
        context,
        url,
      );

      // Wait for analysis to end
      const scrapTimeout = 8 * 60 * 1000;
      test.setTimeout(scrapTimeout);
      const post = await waitForPostStored(context, reelId, scrapTimeout);

      // Test post values
      expect(post.postId).toEqual(reelId);
      expect(post.url).toEqual(triggerResult.postUrl);
      expect(post.publishedAt).toEqual({
        type: "absolute",
        date: "2026-05-05T00:00:00.000Z",
      });
      expect(new Date(post.scrapedAt).getTime()).toBeLessThan(Date.now());

      // Check comments
      const topLevelComments = post.comments;

      const allComments = flattenComments(topLevelComments);

      // Ensure have top level comments
      expect(topLevelComments.length).toBeGreaterThan(0);

      // Test all comment have commentId
      expect(allComments.every((comment) => comment.commentId !== null)).toBe(
        true,
      );

      // Test some comments have emojis
      expect(
        allComments.some((c) =>
          /\p{Extended_Pictographic}/u.test(c.textContent),
        ),
      ).toBeTruthy();

      // Test likes parsing: at least one comment with >0 likes
      expect(allComments.some((comment) => comment.nbLikes > 0)).toBe(true);

      // Test comments have text
      expect(
        allComments.some((comment) => comment.textContent.length > 0),
      ).toBe(true);

      if (triggerResult.authenticated) {
        // Replies are only present in instagram if authenticated
        // TODO: document how to use a chrome profile with an authenticated session for local test
        const firstLevelReplies = topLevelComments.flatMap((c) => c.replies);
        expect(firstLevelReplies.length).toBeGreaterThan(0);
      }
    });
  });
});
