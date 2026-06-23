import { ScrapingContentScript } from "@/shared/scraping-content-script/ScrapingContentScript";
import { YOUTUBE_SCRAPING_CONTENT_SCRIPT_MATCHES } from "@/shared/scraping-content-script/content-script-matches";
import { YoutubeScraper } from "./YoutubeScraper";

export default defineContentScript({
  matches: YOUTUBE_SCRAPING_CONTENT_SCRIPT_MATCHES,
  main() {
    const allowDegradedScrapping = Boolean(
      import.meta.env.VITE_YT_ALLOW_DEGRADED_SCRAPPING,
    );
    const scraper = new YoutubeScraper(allowDegradedScrapping);

    new ScrapingContentScript(scraper).initialize();
  },
});
