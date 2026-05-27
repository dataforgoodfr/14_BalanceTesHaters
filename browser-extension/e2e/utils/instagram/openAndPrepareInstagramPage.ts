import { BrowserContext, Page } from "@playwright/test";

export async function openAndPrepareInstagramPage(
  context: BrowserContext,
  instagramUrl: string,
): Promise<Page> {
  console.log("[E2E] Opening instagram page ", instagramUrl);
  const postPage = await context.newPage();
  await postPage.goto(instagramUrl, { waitUntil: "domcontentloaded" });

  // Leave time to load cookie dialog
  await postPage.waitForTimeout(3000);

  for (;;) {
    await closeCookieDialogIfPresent(postPage);

    const contentVisible = await postPage.locator("video,article").isVisible();
    if (contentVisible) {
      console.log("[E2E] Found instagram content");
      return postPage;
    }
    await postPage.waitForTimeout(500);
  }
}

async function closeCookieDialogIfPresent(page: Page) {
  const closeCookieDialog = page.locator("button").filter({
    hasText: /Decline optional cookies|Refuser les cookies optionnels/,
  });

  if (await closeCookieDialog.isVisible()) {
    console.debug("[E2E] Closing Cookie Dialog");
    await closeCookieDialog.click();
  }
}
