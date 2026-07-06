import { ScrapingContentScript } from "@/shared/scraping-content-script/ScrapingContentScript";
import { TIKTOK_SCRAPING_CONTENT_SCRIPT_MATCHES } from "@/shared/scraping-content-script/content-script-matches";
import { TiktokScraper } from "./TiktokScraper";

export default defineContentScript({
  matches: TIKTOK_SCRAPING_CONTENT_SCRIPT_MATCHES,
  main() {
    const scraper = new TiktokScraper();

    const scs = new ScrapingContentScript(scraper);
    scs.initialize();
  },
});
