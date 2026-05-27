import { openSidePanel } from "@/entrypoints/actions/openSidePanel";
import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { StartScrapingResult } from "@/shared/scraping-content-script/StartScrapingResult";
import { sleep } from "@/shared/utils/sleep";

export async function openPostAndStartScraping(
  postUrl: string,
): Promise<StartScrapingResult> {
  const newTab = await browser.tabs.create({
    url: postUrl,
  });
  if (!newTab.id) {
    throw new Error("Failed to open tab Id");
  }
  const client = new ScrapingContentScriptClient(newTab.id);
  const start = Date.now();
  for (;;) {
    const pageInfo = await client.getTabSocialNetworkPageInfo();
    if (pageInfo.isScrapablePost) {
      const scrapingPromise = client.startScraping();
      await openSidePanel(newTab.id);
      return await scrapingPromise;
    }
    if (Date.now() - start > 10000) {
      throw new Error("Failed to start scraping for url: " + postUrl);
    }
    // Wait for Content script to be ready
    await sleep(200);
  }
}
