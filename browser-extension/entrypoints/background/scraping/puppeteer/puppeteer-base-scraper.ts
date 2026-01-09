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

  private async getBrowserPageFromTab(tab: Browser.tabs.Tab): Promise<Page> {
    this.browser = await connect({
      transport: await ExtensionTransport.connectTab(tab.id!),
    });
    const [page] = await this.browser.pages();
    return page;
  }

  private async disconnectBrowser() {
    if (this.browser) {
      this.browser.disconnect();
    }
  }

  public async scrapTab(tab: Browser.tabs.Tab): Promise<Post> {
    const page = await this.getBrowserPageFromTab(tab);
    try {
      return this.doScrapTab(tab, page);
    } finally {
      this.disconnectBrowser();
    }
  }

  abstract doScrapTab(tab: Browser.tabs.Tab, page: Page): Promise<Post>;
}
