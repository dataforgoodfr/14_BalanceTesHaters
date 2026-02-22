import type { PostSnapshot } from "@/shared/model/PostSnapshot";

export interface Scraper {
  scrapTab(tab: Browser.tabs.Tab): Promise<PostSnapshot>;
}
