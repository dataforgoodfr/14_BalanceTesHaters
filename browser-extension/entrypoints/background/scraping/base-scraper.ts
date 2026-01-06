import {
  connect,
  ExtensionTransport,
  Browser as PuppeteerBrowser,
} from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import type { Post } from "../../shared/model/post";

export abstract class BaseScraper {
  browser?: PuppeteerBrowser;
  constructor() {}

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async getBrowserPageFromTab(tab: Browser.tabs.Tab) {
    this.browser = await connect({
      transport: await ExtensionTransport.connectTab(tab.id!),
    });
    const [page] = await this.browser.pages();
    return page;
  }

  async disconnectBrowser() {
    if (this.browser) {
      this.browser.disconnect();
    }
  }

  abstract scrapTab(tab: Browser.tabs.Tab): Promise<Post>;
}
