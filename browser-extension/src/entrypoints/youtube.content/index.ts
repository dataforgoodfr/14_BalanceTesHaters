import { isYoutubeScrapPostMessage } from "./cs-scrap-youtube-post-message";
import { YoutubePostNativeScrapper } from "./youtube-post-native-scrapper";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  main() {
    function handleMessage(
      message: unknown,
      sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ): boolean | undefined {
      console.info("[CSYT] - Recevied message ", message, "from", sender);
      if (isYoutubeScrapPostMessage(message)) {
        new YoutubePostNativeScrapper().scrapPost().then((post) => {
          console.info("[CSYT] - sending response", post);
          sendResponse(post);
        });
        return true;
      }
    }
    browser.runtime.onMessage.addListener(handleMessage);
  },
});
