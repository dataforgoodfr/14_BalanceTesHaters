import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";

export function startScraping(tabId: number) {
  // Start scraping without waiting for result
  void new ScrapingContentScriptClient(tabId).scrapPost();
}
