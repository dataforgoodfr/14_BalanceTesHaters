import { parseSocialNetworkUrl } from "../../shared/social-network-url";
import { Post } from "../model";
import { createScraper } from "./create-scraper";

export async function scrapTab(
  tab: globalThis.Browser.tabs.Tab
): Promise<Post> {
  if (tab.url === undefined) {
    throw new Error("Url of tab is undefined");
  }
  const snUrl = parseSocialNetworkUrl(tab.url);
  if (!snUrl) {
    throw new Error("Url of tab is not scrapable!");
  }
  const scraper = createScraper(snUrl.socialNetwork);
  try {
    const socialNetworkPost = await scraper.scrapTab(tab);

    return socialNetworkPost;
  } finally {
    await scraper.disconnectBrowser();
  }
}
