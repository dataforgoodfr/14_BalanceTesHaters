import { BrowserContext, Page } from "@playwright/test";

export async function openAndPrepareYoutubeVideoPage(
  context: BrowserContext,
  youtubeVideoUrl: string,
): Promise<Page> {
  const youtubePage = await context.newPage();
  await youtubePage.goto(youtubeVideoUrl, { waitUntil: "domcontentloaded" });
  await closeCookieDialogIfPresent(youtubePage);
  // Wait for page to load video element.
  // YouTube can first display a consent page before loading the player.
  await youtubePage.waitForTimeout(500);
  await closeCookieDialogIfPresent(youtubePage);
  // In CI, the video element can stay hidden while still being fully loaded.
  // We only need the player DOM to be present before starting scraping tests.
  await youtubePage.locator("video").first().waitFor({
    state: "attached",
    timeout: 15_000,
  });
  await youtubePage.waitForTimeout(500);
  return youtubePage;
}

async function closeCookieDialogIfPresent(youtubePage: Page) {
  const closeCookieDialog = youtubePage
    .getByRole("button")
    .filter({ hasText: /Reject all|Tout refuser/ });
  if (await closeCookieDialog.isVisible()) {
    await closeCookieDialog?.click();
  }
}
