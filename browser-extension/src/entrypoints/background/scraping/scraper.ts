import type { Post } from "@/shared/model/post";

export interface Scraper {
  scrapTab(tab: Browser.tabs.Tab): Promise<Post>;
}
