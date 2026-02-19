import { upsertPost } from "../../shared/storage/posts-storage";
import { isScrapTabMessage } from "./scraping/scrap-tab-message";
import { scrapTab as scrapPostFromTab } from "./scraping/scrap-tab";
import { screenshotSenderTab } from "../../shared/native-screenshoting/background/screenshot-sender-tab";
import { isScreenshotSenderTab } from "../../shared/native-screenshoting/message";
import { submitClassificationRequestForPost } from "./classification/submitClassificationForPost";
import { isSubmitClassificationRequestMessage } from "./classification/submitClassificationForPostMessage";
import { isUpdatePostWithClassificationResultMessage } from "./classification/updatePostWithClassificationResultMessage";
import { updatePostWithClassificationResult } from "./classification/updatePostWithClassificationResult";

export default defineBackground(() => {
  console.log("Hello background!", { extensionId: browser.runtime.id });

  function handleMessages(
    message: unknown,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) {
    console.debug("Background - Message received:", message, sender);

    if (isScrapTabMessage(message)) {
      browser.tabs.get(message.tabId).then((tab) => {
        return scrapTab(tab);
      });
      return;
    } else if (isScreenshotSenderTab(message)) {
      screenshotSenderTab(sender).then((data) => {
        sendResponse(data);
      });
      return true;
    } else if (isSubmitClassificationRequestMessage(message)) {
      console.debug("Background - Request classification  message");
      submitClassificationRequestForPost(
        message.postId,
        message.scrapedAt,
      ).then((success: boolean) => {
        sendResponse({ success: success });
      });
      return true;
    } else if (isUpdatePostWithClassificationResultMessage(message)) {
      console.debug("Background - Update classification status");
      updatePostWithClassificationResult(
        message.postId,
        message.scrapedAt,
      ).then((success: boolean) => {
        sendResponse({ success: success });
      });
      return true;
    }
  }

  console.log("Background - registering listener");
  browser.runtime.onMessage.addListener(handleMessages);
});

async function scrapTab(tab: Browser.tabs.Tab) {
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
    await upsertPost(socialNetworkPost);

    await submitClassificationRequestForPost(
      socialNetworkPost.postId,
      socialNetworkPost.scrapedAt,
    );
  }
}
