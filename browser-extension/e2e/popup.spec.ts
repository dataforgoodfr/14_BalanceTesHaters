import { test, expect } from "./fixtures";
import { openAndPrepareYoutubeVideoPage } from "./utils/openAndPrepareYoutubePage";
import { youtubeVideoUrl } from "./utils/triggerYoutubeVideoScraping";
import { PopupPageObject } from "./po/PopupPageObject";

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
    await openAndPrepareYoutubeVideoPage(context, videoUrl);

    // Open popup linked to youtube Page
    const popupPage = await PopupPageObject.open(
      extensionId,
      context,
      videoUrl,
    );

    await expect(popupPage.viewAnalysisButton()).toBeVisible();

    await expect(popupPage.startScrapingButton()).toBeVisible();
  });
});
