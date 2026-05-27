import { Page, BrowserContext } from "@playwright/test";
import { PopupPageObject } from "../po/PopupPageObject";
import { START_SCRAPING_LOG } from "@/shared/scraping-content-script/ScrapingContentScript";

export type TriggerScrapingResult = {
  postPage: Page;
  postUrl: string;
  scrapingStarted: boolean;
};
export async function triggerPageScrapping(
  postPage: Page,
  postUrl: string,
  context: BrowserContext,
  extensionId: string,
): Promise<TriggerScrapingResult> {
  const postPageUrl = postPage.url();
  console.log("[E2E] triggerPageScrapping for postPage with url:", postPageUrl);

  const popupPage = await PopupPageObject.openLinkedToUrl(
    extensionId,
    context,
    postPageUrl,
  );
  await popupPage.page.bringToFront();

  const scrapingStartedPromise = postPage
    .waitForEvent("console", {
      predicate: (msg) => msg.text().includes(START_SCRAPING_LOG),
      timeout: 15000,
    })
    .then(() => true)
    .catch(() => false);

  const startScrapingButton = popupPage.startScrapingButton();
  await startScrapingButton.waitFor({ state: "visible", timeout: 15000 });
  if (!(await startScrapingButton.isEnabled())) {
    throw new Error("Start scraping button is disabled for url: " + postUrl);
  }
  console.log("[E2E] - Clicking start scraping button");
  await startScrapingButton.click();
  await postPage.bringToFront();
  const scrapingStarted = await scrapingStartedPromise;
  return {
    postUrl: postUrl,
    postPage,
    scrapingStarted,
  };
}
