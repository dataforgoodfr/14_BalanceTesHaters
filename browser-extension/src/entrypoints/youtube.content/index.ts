import { ScrapingContentScript } from "@/shared/scraping-content-script/ScrapingContentScript";
import { YOUTUBE_SCRAPING_CONTENT_SCRIPT_MATCHES } from "@/shared/scraping-content-script/content-script-matches";
import { YoutubeScraper } from "./YoutubeScraper";

export default defineContentScript({
  matches: YOUTUBE_SCRAPING_CONTENT_SCRIPT_MATCHES,
  main() {
    const scraper = new YoutubeScraper();

    new ScrapingContentScript(scraper).initialize();
  },
});
