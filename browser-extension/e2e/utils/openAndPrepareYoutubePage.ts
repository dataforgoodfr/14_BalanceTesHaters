import { BrowserContext, Page } from "@playwright/test";

export async function openAndPrepareYoutubeVideoPage(
  context: BrowserContext,
  youtubeVideoUrl: string,
): Promise<Page> {
  const youtubePage = await context.newPage();
  await youtubePage.goto(youtubeVideoUrl);
  // Wait for page to load  video element
  await youtubePage.waitForSelector("video");

  await youtubePage.waitForTimeout(1000);

  await closeCookieDialogIfPresent(youtubePage);
  return youtubePage;
}

async function closeCookieDialogIfPresent(youtubePage: Page) {
  const closeCookieDialog = await youtubePage
    .getByRole("button")
    .filter({ hasText: /Reject all|Tout refuser/ });
  if (await closeCookieDialog.isVisible()) {
    await closeCookieDialog?.click();
  }
}
