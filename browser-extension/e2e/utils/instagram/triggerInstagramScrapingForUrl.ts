import { BrowserContext } from "@playwright/test";
import {
  triggerPageScrapping,
  TriggerScrapingResult,
} from "../triggerPageScrapping";
import { openAndPrepareInstagramPage } from "./openAndPrepareInstagramPage";

export type InstagramTriggerScrapingResult = TriggerScrapingResult & {
  authenticated: boolean;
};
export async function triggerInstagramScrapingForUrl(
  extensionId: string,
  context: BrowserContext,
  postUrl: string,
): Promise<InstagramTriggerScrapingResult> {
  // Navigate to a YouTube video
  const scrappablePage = await openAndPrepareInstagramPage(context, postUrl);
  const loginVisible =
    (await scrappablePage
      .locator("a", { hasText: /Log In|Se connecter/ })
      .count()) > 0;
  const result = await triggerPageScrapping(
    scrappablePage,
    postUrl,
    context,
    extensionId,
  );
  return { ...result, authenticated: !loginVisible };
}

export function instagramReelUrl(acocuntName: string, reelId: string) {
  return `https://www.instagram.com/${acocuntName}/reel/${reelId}/`;
}

export function instagramPostUrl(acocuntName: string, postId: string) {
  return `https://www.instagram.com/${acocuntName}/p/${postId}`;
}
