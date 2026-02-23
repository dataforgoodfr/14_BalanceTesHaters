import { ScrapingContentScript } from "@/shared/scraping-content-script/ScrapingContentScript";
import { InstagramScraper } from "./InstagramScraper";

export default defineContentScript({
  matches: ["https://www.instagram.com/*"],
  main() {
    const scraper = new InstagramScraper();
    new ScrapingContentScript(scraper).registerListener();
  },
});
