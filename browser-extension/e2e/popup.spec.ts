import { test, expect } from "./fixtures";
import { youtubeVideoUrl } from "./scraping/youtube/youtubeVideoUrl";
import { PopupPageObject } from "./po/PopupPageObject";
import { openAndPrepareYoutubeVideoPage } from "./scraping/youtube/openAndPrepareYoutubeVideoPage";

test.describe("Test popup content", () => {
  test("Test Popup when not linked to a social network  tab", async ({
    context,
    extensionId,
  }) => {
    // Open popup
    const popupPage = await PopupPageObject.open(extensionId, context);

    // Test view analysis is present
    await expect(popupPage.viewAnalysisButton()).toBeVisible();

    // Test start scraping button not present
    await expect(popupPage.startScrapingButton()).toHaveCount(0);
  });

  test("Test Popup when linked to youtube video tab", async ({
    context,
    extensionId,
  }) => {
    const videoUrl = youtubeVideoUrl("Gp15Y_KlBPY");
    await openAndPrepareYoutubeVideoPage(videoUrl, context);

    // Open popup linked to youtube Page
    const popupPage = await PopupPageObject.openLinkedToUrl(
      extensionId,
      context,
      videoUrl,
    );

    await expect(popupPage.viewAnalysisButton()).toBeVisible();

    await expect(popupPage.startScrapingButton()).toBeVisible();
  });
});
