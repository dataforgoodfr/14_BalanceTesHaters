import { ScrapingContentScript } from "@/shared/scraping-content-script/ScrapingContentScript";
import { INSTAGRAM_SCRAPING_CONTENT_SCRIPT_MATCHES } from "@/shared/scraping-content-script/content-script-matches";
import { InstagramScraper } from "./InstagramScraper";

export default defineContentScript({
  matches: INSTAGRAM_SCRAPING_CONTENT_SCRIPT_MATCHES,
  main() {
    const scraper = new InstagramScraper();

    const scs = new ScrapingContentScript(scraper);
    scs.initialize();
  },
});
