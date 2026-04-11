import { BrowserContext, Page } from "@playwright/test";

export async function openAndPrepareYoutubeVideoPage(
  context: BrowserContext,
  youtubeVideoUrl: string,
): Promise<Page> {
  const youtubePage = await context.newPage();
  await youtubePage.goto(youtubeVideoUrl);
  await closeCookieDialogIfPresent(youtubePage);
  // Wait for page to load video element.
  // YouTube can first display a consent page before loading the player.
  await youtubePage.waitForTimeout(1000);
  await closeCookieDialogIfPresent(youtubePage);
  await youtubePage.waitForSelector("video", { timeout: 60_000 });
  await youtubePage.waitForTimeout(1000);
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
