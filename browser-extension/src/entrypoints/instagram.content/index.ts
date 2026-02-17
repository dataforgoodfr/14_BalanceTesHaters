import { isInstagramScrapPostMessage } from "./cs-scrap-instagram-post-message";
import { InstagramPostNativeScraper } from "./instagram-post-native-scraper";

export default defineContentScript({
  matches: ["https://www.instagram.com/*"],
  main() {
    function handleMessage(
      message: unknown,
      sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ): boolean | undefined {
      console.info("[CSINSTA] - Received message ", message, "from", sender);
      if (isInstagramScrapPostMessage(message)) {
        new InstagramPostNativeScraper().scrapPost().then((post) => {
          console.info("[CSINSTA] - sending response", post);
          sendResponse(post);
        });
        return true;
      }
    }
    browser.runtime.onMessage.addListener(handleMessage);
  },
});
