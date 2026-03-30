import { ScrapTabMessage } from "../background/scraping/scrap-tab-message";

export function startScraping(tabId: number) {
  const message: ScrapTabMessage = {
    msgType: "scrap-tab",
    tabId: tabId,
  };
  void browser.runtime.sendMessage(message);
}
