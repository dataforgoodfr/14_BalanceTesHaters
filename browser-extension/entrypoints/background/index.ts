import { getCurrentTab } from "../shared/utils/getCurrentTab";
import { BaseScraper } from "./base-scraper";
import { InstagramScraper } from "./instagram/instagram-scraper";
import { YoutubeScraper } from "./youtube/youtube-scraper";
export default defineBackground(() => {
  console.log("Hello background!", { extensionId: browser.runtime.id });

  async function handleMessages(message: any, sender: any, sendResponse: any) {
    console.log("message received:", message, sender);

    const tab = await getCurrentTab();

    if (tab?.id) {
      let scraper: BaseScraper;
      console.log("Action button clicked!");
      if (tab.url?.match(/youtube\.com/)) {
        scraper = new YoutubeScraper();
      } else if (tab.url?.match(/instagram\.com/)) {
        scraper = new InstagramScraper();
      } else {
        console.log("Site non supporté pour le moment.");
        return;
      }
      try {
        const pub = await scraper.scrapTab(tab);
        console.log("Publication scraped:", pub);
        if (pub.comments.length > 0) {
          const screenshotDataUrl: string = pub.comments[0].screenshotDataUrl;
          browser.downloads.download({
            url: screenshotDataUrl, // The object URL can be used as download URL
            filename: "screenshot.png",
            //...
          });
        }
      } finally {
        await scraper.disconnectBrowser();
      }
    }
  }
  console.log("registering listener");
  browser.runtime.onMessage.addListener(handleMessages);
});
