import { Page } from "@playwright/test";
import { BrowserContext } from "@playwright/test";
import { openAndPrepareYoutubeVideoPage } from "./openAndPrepareYoutubePage";
import { findTabIdForUrl } from "./findTabIdForUrl";
import { PopupPageObject } from "../po/PopupPageObject";

type TriggerScrapingResult = {
  postPage: Page;
  postUrl: string;
  postTabId: number;
  scrapingStarted: boolean;
};

export async function triggerYoutubeVideoScraping(
  extensionId: string,
  context: BrowserContext,
  youtubeVideoId: string,
): Promise<TriggerScrapingResult> {
  return triggerYoutubeScrapingForUrl(
    extensionId,
    context,
    youtubeVideoUrl(youtubeVideoId),
  );
}

export async function triggerYoutubeScrapingForUrl(
  extensionId: string,
  context: BrowserContext,
  postUrl: string,
): Promise<TriggerScrapingResult> {
  // Navigate to a YouTube video
  const youtubePage = await openAndPrepareYoutubeVideoPage(context, postUrl);
  const resolvedPostUrl = youtubePage.url();

  const tabId =
    (await findTabIdForUrl(context, resolvedPostUrl)) ??
    (await findTabIdForUrl(context, postUrl));
  if (!tabId) {
    throw new Error("Couldn't find tab for url");
  }

  const popupPage = await PopupPageObject.open(
    extensionId,
    context,
    resolvedPostUrl,
  );
  await popupPage.page.bringToFront();

  const scrapingStartedPromise = youtubePage
    .waitForEvent("console", {
      predicate: (msg) => msg.text().includes("[SCS] - Start scraping"),
      timeout: 15_000,
    })
    .then(() => true)
    .catch(() => false);

  const startScrapingButton = popupPage.startScrapingButton();
  await startScrapingButton.waitFor({ state: "visible", timeout: 15_000 });
  if (!(await startScrapingButton.isEnabled())) {
    throw new Error("Start scraping button is disabled for url: " + postUrl);
  }
  await startScrapingButton.click();
  await youtubePage.bringToFront();
  const scrapingStarted = await scrapingStartedPromise;
  return {
    postUrl,
    postPage: youtubePage,
    postTabId: tabId,
    scrapingStarted,
  };
}

export function youtubeVideoUrl(youtubeVideoId: string) {
  return `https://www.youtube.com/watch?v=${youtubeVideoId}`;
}

export function youtubeShortUrl(youtubeShortId: string) {
  return `https://www.youtube.com/shorts/${youtubeShortId}`;
}
