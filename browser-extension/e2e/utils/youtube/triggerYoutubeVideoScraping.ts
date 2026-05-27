import { BrowserContext } from "@playwright/test";
import { openAndPrepareYoutubeVideoPage } from "./openAndPrepareYoutubePage";
import {
  triggerPageScrapping,
  TriggerScrapingResult,
} from "../triggerPageScrapping";

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
  const scrappablePage = await openAndPrepareYoutubeVideoPage(context, postUrl);
  return await triggerPageScrapping(
    scrappablePage,
    postUrl,
    context,
    extensionId,
  );
}

export function youtubeVideoUrl(youtubeVideoId: string) {
  return `https://www.youtube.com/watch?v=${youtubeVideoId}`;
}

export function youtubeShortUrl(youtubeShortId: string) {
  return `https://www.youtube.com/shorts/${youtubeShortId}`;
}
