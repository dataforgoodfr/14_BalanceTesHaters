import type { Post } from "@/entrypoints/shared/model/post";

export interface Scraper {
  scrapTab(tab: Browser.tabs.Tab): Promise<Post>;
}
