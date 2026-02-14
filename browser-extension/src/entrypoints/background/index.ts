import { storePost } from "../../shared/storage/posts-storage";
import { getCurrentTab } from "../../shared/utils/getCurrentTab";
import { isScrapActiveTabMessage } from "./scraping/scrap-active-tab-message";
import { scrapTab as scrapPostFromTab } from "./scraping/scrap-tab";
import { screenshotSenderTab } from "../../shared/native-screenshoting/background/screenshot-sender-tab";
import { isScreenshotSenderTab } from "../../shared/native-screenshoting/message";
import { requestClassificationForPost } from "./classification/requestClassificationForPost";
import { isRequestClassificationMessage } from "./classification/requestClassificationForPostMessage";

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
    } else if (isRequestClassificationMessage(message)) {
      console.debug("Background - Requet classification  message");
      requestClassificationForPost(message.postId, message.scrapedAt).then(
        (success: boolean) => {
          sendResponse({ success: success });
        },
      );
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

    await requestClassificationForPost(
      socialNetworkPost.postId,
      socialNetworkPost.scrapedAt,
    );
  }
}
