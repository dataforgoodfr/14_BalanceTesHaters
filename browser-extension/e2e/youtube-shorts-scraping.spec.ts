import { test, expect } from "./fixtures";
import { youtubeShortUrl } from "./scraping/youtube/youtubeShortUrl";
import { e2eScrapPost, E2EScrapPostResult } from "./scraping/e2eScrapPost";
import { openAndPrepareYoutubeShortsPage } from "./scraping/youtube/openAndPrepareYoutubeShortsPage";
import { E2E_TESTED_LOCALES } from "./E2E_TESTED_LOCALES";
import { checkPostSnapshotGenericExpectations } from "./utils/checkPostSnapshotGenericExpectations";
import { expectCommentsToMatchInvariants } from "./utils/expectCommentsToMatchInvariants";
import { expectSomeCommentsToHaveEmojis } from "./utils/expectSomeCommentsToHaveEmojis";
import { expectSomeCommentsToHaveLikes } from "./utils/expectSomeCommentsToHaveLikes";
import { PUBLISHED_AT_PLACEHOLDER_FOR_DEGRADED_SCRAPPING } from "@/entrypoints/youtube.content/PUBLISHED_AT_PLACEHOLDER_FOR_DEGRADED_SCRAPPING";

E2E_TESTED_LOCALES.forEach((locale) => {
  test.describe(`Youtube Shorts Scrapping (locale:${locale})`, () => {
    test.describe.configure({ mode: "serial" });
    test.use({ locale });

    const postId = "WPpURgqzXZ4";
    const postUrl = youtubeShortUrl(postId);

    let scrappingResult: E2EScrapPostResult;
    test(`Run scrapping`, async ({ extensionId, context }, testInfo) => {
      scrappingResult = await e2eScrapPost({
        postUrl,
        openAndPreparePage: openAndPrepareYoutubeShortsPage,
        context,
        extensionId,
        testInfo,
      });
    });

    test(`Check post metadata`, () => {
      const { postSnapshot } = scrappingResult;

      checkPostSnapshotGenericExpectations(postSnapshot);
      expect(postSnapshot.postId).toEqual(postId);
      expect(postSnapshot.url).toEqual(postUrl);

      if (scrappingResult.platformSuspectingBot) {
        // When youtube suspect we are a bot it prevents og meta scrapping
        expect(postSnapshot.title).toBeUndefined();
        expect(postSnapshot.publishedAt).toEqual(
          PUBLISHED_AT_PLACEHOLDER_FOR_DEGRADED_SCRAPPING,
        );
      } else {
        expect(postSnapshot.title).toContain(
          "Celles et ceux qui ne voulaient pas être ce qu’elles/ils étaient",
        );
        expect(postSnapshot.publishedAt).toEqual({
          type: "absolute",
          date: "2025-02-19T17:00:41.000Z",
        });
      }
    });

    test(`Check comments`, () => {
      const { postSnapshot } = scrappingResult;

      // Check comments
      const topLevelComments = postSnapshot.comments;

      // Ensure have top level comments
      expect(topLevelComments.length).toBeGreaterThan(0);
      expectCommentsToMatchInvariants(topLevelComments);

      expectSomeCommentsToHaveEmojis(topLevelComments);

      expectSomeCommentsToHaveLikes(topLevelComments);
    });

    test(`Check first level replies`, () => {
      const { postSnapshot } = scrappingResult;

      // Check comments
      const firstLevelReplies = postSnapshot.comments.flatMap((c) => c.replies);

      // Ensure have replies
      expect(firstLevelReplies.length).toBeGreaterThan(0);
      expectCommentsToMatchInvariants(firstLevelReplies);
    });
  });
});
