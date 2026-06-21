import { BrowserContext, Page } from "@playwright/test";
import { closeYoutubeCookieDialogIfPresent as waitAndCloseYoutubeCookieDialogIfPresent } from "./closeYoutubeCookieDialogIfPresent";

export async function openAndPrepareYoutubeVideoPage(
  postUrl: string,
  context: BrowserContext,
): Promise<Page> {
  const postPage: Page = await context.newPage();
  await postPage.goto(postUrl, { waitUntil: "domcontentloaded" });
  console.info("[E2E] domcontentloaded.");
  console.info("[E2E] preparing postPage.");

  console.info("[E2E] waiting for content.");

  // In CI, the video element can stay hidden while still being fully loaded.
  // We only need the player DOM to be present before starting scraping tests.
  await postPage.locator("video").first().waitFor({
    state: "attached",
    timeout: 15000,
  });

  await waitAndCloseYoutubeCookieDialogIfPresent(postPage);
  return postPage;
}
