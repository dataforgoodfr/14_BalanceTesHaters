import { Page } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { PuppeteerBaseScraper } from "../puppeteer/puppeteer-base-scraper";
import { type Post } from "../../../shared/model/post";
import { parseSocialNetworkUrl } from "@/entrypoints/shared/social-network-url";
import { YoutubePostScrapper as PuppeteerYoutubePostScrapper } from "./youtube-post-scrapper";

export class YoutubeScraper extends PuppeteerBaseScraper {
  async doScrapTab(tab: Browser.tabs.Tab, page: Page): Promise<Post> {
    const postUrl = tab.url!;
    const urlInfo = parseSocialNetworkUrl(postUrl);
    if (!urlInfo) {
      throw new Error("Unexpected");
    }
    const scraper = new PuppeteerYoutubePostScrapper(page, postUrl, urlInfo);

    return await scraper.scrapPost();
  }
}
