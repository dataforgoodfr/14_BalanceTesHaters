import { test, expect } from "./fixtures";
import { instagramReelUrl } from "./scraping/instagram/instagramReelUrl";
import { e2eScrapPost, E2EScrapPostResult } from "./scraping/e2eScrapPost";
import { openAndPrepareInstagramPage } from "./scraping/instagram/openAndPrepareInstagramPage";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { checkPostSnapshotGenericExpectations } from "./utils/checkPostSnapshotGenericExpectations";
import { expectCommentsToMatchInvariants } from "./utils/expectCommentsToMatchInvariants";
import { E2E_TESTED_LOCALES } from "./E2E_TESTED_LOCALES";
import { expectSomeCommentsToHaveLikes } from "./utils/expectSomeCommentsToHaveLikes";
import { expectSomeCommentsToHaveEmojis } from "./utils/expectSomeCommentsToHaveEmojis";

E2E_TESTED_LOCALES.forEach((locale) => {
  test.describe(`Instagram Reel Scrapping (locale:${locale})`, () => {
    test.use({ locale: locale });
    test.describe.configure({ mode: "serial" });

    const reelId = "DX9g-fpCIbF";
    const account = "feministsinthecity";
    const postUrl = instagramReelUrl(account, reelId);

    let scrappingResult: E2EScrapPostResult;
    test(`Run scrapping`, async ({ extensionId, context }, testInfo) => {
      scrappingResult = await e2eScrapPost({
        postUrl,
        openAndPreparePage: openAndPrepareInstagramPage,
        context,
        extensionId,
        testInfo,
      });
    });

    test(`Check post metadata`, () => {
      test.skip(scrappingResult === undefined);
      const { postSnapshot } = scrappingResult;

      checkPostSnapshotGenericExpectations(postSnapshot);

      // Test post values
      expect(postSnapshot.postId).toEqual(reelId);
      expect(postSnapshot.url).toEqual(postUrl);
      expect(postSnapshot.publishedAt).toEqual({
        type: "absolute",
        date: "2026-05-05T00:00:00.000Z",
      });
      expect(postSnapshot.socialNetwork).toEqual(SocialNetwork.Instagram);
      expect(postSnapshot.author.name).toEqual(account);
    });

    test(`Check top level comments`, () => {
      test.skip(scrappingResult === undefined);
      // Check comments
      const topLevelComments = scrappingResult.postSnapshot.comments;

      // Ensure have top level comments
      expect(topLevelComments.length).toBeGreaterThan(0);

      expectCommentsToMatchInvariants(topLevelComments);

      expectSomeCommentsToHaveEmojis(topLevelComments);

      expectSomeCommentsToHaveLikes(topLevelComments);
    });

    test(`Check first level replies data`, () => {
      test.skip(
        scrappingResult === undefined || !scrappingResult.authenticated,
        "Not Authenticated: skipping replies checks as instagram replies are not available when not authenticated.",
      );

      // Replies are only present in instagram if authenticated
      // TODO: document how to use a chrome profile with an authenticated session for local test
      const firstLevelReplies = scrappingResult.postSnapshot.comments.flatMap(
        (c) => c.replies,
      );
      expect(firstLevelReplies.length).toBeGreaterThan(0);
      expectCommentsToMatchInvariants(firstLevelReplies);
      expectSomeCommentsToHaveEmojis(firstLevelReplies);

      expectSomeCommentsToHaveLikes(firstLevelReplies);
    });
  });
});
