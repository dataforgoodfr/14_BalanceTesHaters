import { type Post } from "@/shared/model/post";
import { parseSocialNetworkUrl } from "@/shared/social-network-url";
import { Scraper } from "../scraper";
import { CS_SCRAP_INSTA_POST } from "@/entrypoints/instagram.content/cs-scrap-instagram-post-message";

export class InstagramNativeScraper implements Scraper {
  async scrapTab(tab: Browser.tabs.Tab): Promise<Post> {
    const postUrl = tab.url!;
    const urlInfo = parseSocialNetworkUrl(postUrl);
    if (!urlInfo) {
      throw new Error("Unexpected");
    }

    // This scraper delegates the scraping to the instagram content script
    const result = await browser.tabs.sendMessage(tab.id!, CS_SCRAP_INSTA_POST);
    console.log("InstagramNativeScraper - message response received", result);
    return result as Post;
  }
}
