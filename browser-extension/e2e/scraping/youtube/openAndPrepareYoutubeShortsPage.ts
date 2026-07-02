import { BrowserContext, Page } from "@playwright/test";
import { closeYoutubeCookieDialogIfPresent } from "./closeYoutubeCookieDialogIfPresent";
import { OpenAndPrepareResult } from "../e2eScrapPost";
import { isYoutubeSuspectingBot } from "./isYoutubeSuspectingBot";
import { isYoutubeAuthenticated } from "./isYoutubeAuthenticated";

export async function openAndPrepareYoutubeShortsPage(
  postUrl: string,
  context: BrowserContext,
): Promise<OpenAndPrepareResult> {
  const postPage: Page = await context.newPage();
  await postPage.goto(postUrl, { waitUntil: "domcontentloaded" });
  console.info("[E2E] domcontentloaded.");
  console.info("[E2E] preparing postPage.");

  // In Short cookie dialog is full page and prevents viewing shorrts
  await closeYoutubeCookieDialogIfPresent(postPage);

  console.info("[E2E] waiting for content.");
  // In CI, the video element can stay hidden while still being fully loaded.
  // We only need the player DOM to be present before starting scraping tests.
  await postPage.locator("video").first().waitFor({
    state: "attached",
    timeout: 15000,
  });

  const authenticated = await isYoutubeAuthenticated(postPage);
  const platformSuspectingBot = await isYoutubeSuspectingBot(postPage);

  return {
    postPage,
    authenticated,
    platformSuspectingBot,
  };
}
