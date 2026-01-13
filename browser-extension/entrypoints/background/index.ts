import { storePost } from "../shared/storage/posts-storage";
import { getCurrentTab } from "../shared/utils/getCurrentTab";
import { isScrapActiveTabMessage } from "./scraping/scrap-active-tab-message";
import { scrapTab as scrapPostFromTab } from "./scraping/scrap-tab";
import { screenshotSenderTab } from "../shared/native-screenshoting/background/screenshot-sender-tab";
import { isScreenshotSenderTab } from "../shared/native-screenshoting/message";

export default defineBackground(() => {
  console.log("Hello background!", { extensionId: browser.runtime.id });

  function handleMessages(
    message: unknown,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) {
    console.debug("Background - Message received:", message, sender);

    if (isScrapActiveTabMessage(message)) {
      scrapActiveTab();
      return;
    } else if (isScreenshotSenderTab(message)) {
      screenshotSenderTab(sender).then((data) => {
        sendResponse(data);
      });
      return true;
    }
  }
  console.log("Background - registering listener");
  browser.runtime.onMessage.addListener(handleMessages);
});

async function scrapActiveTab() {
  const tab = await getCurrentTab();

  if (tab) {
    console.debug("Background - Scraping post from active tab ", {
      tabId: tab.id,
      url: tab.url,
    });
    const socialNetworkPost = await scrapPostFromTab(tab);
    console.debug(
      "Background - storing post to local storage",
      socialNetworkPost,
    );
    await storePost(socialNetworkPost);
  }
}
