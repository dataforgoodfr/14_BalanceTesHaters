import { test, expect } from "./fixtures";
import { flattenComments } from "./utils/flattenComments";
import { instagramReelUrl } from "./scraping/instagram/instagramReelUrl";
import { e2eScrapPost, E2EScrapPostResult } from "./scraping/e2eScrapPost";
import { openAndPrepareInstagramPage } from "./scraping/instagram/openAndPrepareInstagramPage";
import { isInstagramPageAuthenticated } from "./scraping/instagram/isInstagramPageAuthenticated";

["en-US", "fr-FR"].forEach((locale) => {
  test.describe("Scraping reel with Locale:" + locale, () => {
    test.use({ locale: locale });

    test(`Test scraping reel smoke test locale:${locale}`, async ({
      extensionId,
      context,
    }, testInfo) => {
      const reelId = "DX9g-fpCIbF";
      const postUrl = instagramReelUrl("feministsinthecity", reelId);

      const { postSnapshot: post, authenticated }: E2EScrapPostResult =
        await e2eScrapPost({
          postUrl,
          openAndPreparePage: openAndPrepareInstagramPage,
          detectAuthenticated: isInstagramPageAuthenticated,
          context,
          extensionId,
          testInfo,
        });

      // Test post values
      expect(post.postId).toEqual(reelId);
      expect(post.url).toEqual(postUrl);
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

      if (authenticated) {
        // Replies are only present in instagram if authenticated
        // TODO: document how to use a chrome profile with an authenticated session for local test
        const firstLevelReplies = topLevelComments.flatMap((c) => c.replies);
        expect(firstLevelReplies.length).toBeGreaterThan(0);
      }
    });
  });
});
