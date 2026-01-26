import {
  connect,
  ExtensionTransport,
  Page,
  Browser as PuppeteerBrowser,
} from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import type { Post } from "../../../shared/model/post";
import { Scraper } from "../scraper";

export abstract class PuppeteerBaseScraper implements Scraper {
  browser?: PuppeteerBrowser;
  constructor() {}

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async scrapTab(tab: Browser.tabs.Tab): Promise<Post> {
    this.browser = await connect({
      transport: await ExtensionTransport.connectTab(tab.id!),
    });
    const [page] = await this.browser.pages();
    try {
      return await this.doScrapTab(tab, page);
    } finally {
      if (this.browser) {
        await this.browser.disconnect();
      }
      this.browser = undefined;
    }
  }

  abstract doScrapTab(tab: Browser.tabs.Tab, page: Page): Promise<Post>;
}
