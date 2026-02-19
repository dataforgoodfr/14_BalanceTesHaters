import { Page } from "@playwright/test";
import { BrowserContext } from "@playwright/test";
import { openAndPrepareYoutubeVideoPage } from "./openAndPrepareYoutubePage";
import { findTabIdForUrl } from "./findTabIdForUrl";
import { PopupPageObject } from "../po/PopupPageObject";

type TriggerScrapingResult = {
  postPage: Page;
  postUrl: string;
  postTabId: number;
};

export async function triggerYoutubeVideoScraping(
  extensionId: string,
  context: BrowserContext,
  youtubeVideoId: string,
): Promise<TriggerScrapingResult> {
  const postUrl = youtubeVideoUrl(youtubeVideoId);

  // Navigate to a YouTube video
  const youtubePage = await openAndPrepareYoutubeVideoPage(context, postUrl);

  const tabId = await findTabIdForUrl(context, postUrl);
  if (!tabId) {
    throw new Error("Couldn't find tab for url");
  }

  const popupPage = await PopupPageObject.open(extensionId, context, postUrl);
  await popupPage.page.bringToFront();

  await popupPage.startScrapingButton().click();
  await youtubePage.bringToFront();
  return {
    postUrl,
    postPage: youtubePage,
    postTabId: tabId,
  };
}

export function youtubeVideoUrl(youtubeVideoId: string) {
  return `https://www.youtube.com/watch?v=${youtubeVideoId}`;
}
