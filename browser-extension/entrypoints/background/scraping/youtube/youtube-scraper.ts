import {
  Page,
  ElementHandle,
} from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { BaseScraper } from "../base-scraper";
import { type Post, type Comment, Author } from "../../../shared/model/post";
import { parseSocialNetworkUrl } from "@/entrypoints/shared/social-network-url";
import { currentIsoDate } from "../utils/current-iso-date";
import { innerText } from "../utils/innerText";
import { anchorHref } from "../utils/anchorHref";
import { selectOrThrow } from "../utils/selectOrThrow";
import { YoutubePostScrapper as PuppeteerYoutubePostScrapper } from "./youtube-post-scrapper";

export class YoutubeScraper extends BaseScraper {
  async scrapTab(tab: Browser.tabs.Tab): Promise<Post> {
    const postUrl = tab.url!;
    const urlInfo = parseSocialNetworkUrl(postUrl);
    if (!urlInfo) {
      throw new Error("Unexpected");
    }
    const page = await this.getBrowserPageFromTab(tab);
    const scraper = new PuppeteerYoutubePostScrapper(page, postUrl, urlInfo);

    return await scraper.scrapPost();
  }
}
