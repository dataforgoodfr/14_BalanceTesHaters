import { type Post } from "../../../shared/model/post";
import { parseSocialNetworkUrl } from "@/entrypoints/shared/social-network-url";
import { Scraper } from "../scraper";
import { CS_SCRAP_YT_POST } from "@/entrypoints/youtube.content/cs-scrap-youtube-post-message";

export class YoutubeNativeScraper implements Scraper {
  async scrapTab(tab: Browser.tabs.Tab): Promise<Post> {
    const postUrl = tab.url!;
    const urlInfo = parseSocialNetworkUrl(postUrl);
    if (!urlInfo) {
      throw new Error("Unexpected");
    }

    // This scraper delegates scraping to youtube content script
    const result = await browser.tabs.sendMessage(tab.id!, CS_SCRAP_YT_POST);
    console.log("YoutubeNativeScraper - message response received", result);
    return result as Post;
  }
}
