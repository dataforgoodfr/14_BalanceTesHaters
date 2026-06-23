import { test, expect } from "./fixtures";
import { flattenComments } from "./utils/flattenComments";
import { youtubeVideoUrl } from "./scraping/youtube/youtubeVideoUrl";
import { e2eScrapPost, E2EScrapPostResult } from "./scraping/e2eScrapPost";
import { openAndPrepareYoutubeVideoPage } from "./scraping/youtube/openAndPrepareYoutubeVideoPage";
import { E2E_TESTED_LOCALES } from "./E2E_TESTED_LOCALES";
import { checkPostSnapshotGenericExpectations } from "./utils/checkPostSnapshotGenericExpectations";
import { expectCommentsToMatchInvariants } from "./utils/expectCommentsToMatchInvariants";
import { expectSomeCommentsToHaveLikes } from "./utils/expectSomeCommentsToHaveLikes";
import { expectSomeCommentsToHaveEmojis } from "./utils/expectSomeCommentsToHaveEmojis";

E2E_TESTED_LOCALES.forEach((locale) => {
  test.describe(`Youtube Video Scrapping (locale:${locale})`, () => {
    test.describe.configure({ mode: "serial" });
    test.use({ locale: locale });
    const postId = "bYnBcdxT7os";

    const postUrl = youtubeVideoUrl(postId);

    let scrappingResult: E2EScrapPostResult;
    let expectedCommentCount: number;
    test(`Run scrapping`, async ({ extensionId, context }, testInfo) => {
      scrappingResult = await e2eScrapPost({
        postUrl,
        openAndPreparePage: openAndPrepareYoutubeVideoPage,
        context,
        extensionId,
        testInfo,
      });

      const commentCountElement = await scrappingResult.postPage.$(
        "#comments #count span:nth-of-type(1)",
      );
      const text = (await commentCountElement?.innerText()) || "0";
      expectedCommentCount = Number.parseInt(text);
    });

    test(`Check post metadata`, () => {
      test.skip(scrappingResult === undefined);
      const { postSnapshot } = scrappingResult;

      checkPostSnapshotGenericExpectations(postSnapshot);
      expect(postSnapshot.postId).toEqual(postId);
      expect(postSnapshot.url).toEqual(postUrl);
      expect(postSnapshot.publishedAt).toEqual({
        type: "absolute",
        date: "2025-07-22T00:00:00.000Z",
      });
      expect(postSnapshot.title).toContain("Cher Corps");
    });

    test(`Check top level comments`, () => {
      test.skip(scrappingResult === undefined);
      const { postSnapshot } = scrappingResult;

      // Check comments
      const topLevelComments = postSnapshot.comments;

      // Ensure have top level comments
      expect(topLevelComments.length).toBeGreaterThan(0);
      expectCommentsToMatchInvariants(topLevelComments);

      expectSomeCommentsToHaveEmojis(topLevelComments);
      expectSomeCommentsToHaveLikes(topLevelComments);

      // Test long comment is captured
      expect(
        topLevelComments.find((c) => c.textContent.length > 80),
        "Cher Corps",
      ).toBeDefined();
    });

    test("All comments count", () => {
      test.skip(scrappingResult === undefined);
      const allComments = flattenComments(
        scrappingResult.postSnapshot.comments,
      );

      // Test that total scraped comment count matches youtube displayed count

      expect(allComments.length).toBeLessThanOrEqual(expectedCommentCount);
      expect(allComments.length).toBeGreaterThanOrEqual(
        Math.floor(expectedCommentCount * 0.7),
      );
    });

    test(`Check first level replies`, () => {
      test.skip(scrappingResult === undefined);
      const { postSnapshot } = scrappingResult;

      // Check comments
      const firstLevelReplies = postSnapshot.comments.flatMap((c) => c.replies);

      // Ensure have replies
      expect(firstLevelReplies.length).toBeGreaterThan(0);
      expectCommentsToMatchInvariants(firstLevelReplies);

      expectSomeCommentsToHaveEmojis(firstLevelReplies);
      expectSomeCommentsToHaveLikes(firstLevelReplies);
    });
  });
});
