import { ScrapingContentScript } from "@/shared/scraping-content-script/ScrapingContentScript";
import { YoutubeScraper } from "./YoutubeScraper";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  main() {
    const scraper = new YoutubeScraper();

    new ScrapingContentScript(scraper).registerListener();
  },
});
