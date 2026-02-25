import { isScrapTabMessage } from "./scraping/scrap-tab-message";
import { screenshotSenderTab } from "../../shared/native-screenshoting/background/screenshot-sender-tab";
import { isScreenshotSenderTab } from "../../shared/native-screenshoting/message";
import { submitClassificationRequestForPost } from "./classification/submitClassificationForPost";
import { isSubmitClassificationRequestMessage } from "./classification/submitClassificationForPostMessage";
import { isUpdatePostWithClassificationResultMessage } from "./classification/updatePostWithClassificationResultMessage";
import { updatePostWithClassificationResult } from "./classification/updatePostWithClassificationResult";
import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";

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
        scrapTab(tab);
      });
      return;
    } else if (isScreenshotSenderTab(message)) {
      screenshotSenderTab(sender).then((data) => {
        sendResponse(data);
      });
      return true;
    } else if (isSubmitClassificationRequestMessage(message)) {
      console.debug("Background - Request classification  message");
      submitClassificationRequestForPost(message.postSnapshotId).then(
        (success: boolean) => {
          sendResponse({ success: success });
        },
      );
      return true;
    } else if (isUpdatePostWithClassificationResultMessage(message)) {
      console.debug("Background - Update classification status");
      updatePostWithClassificationResult(message.postSnapshotId).then(
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

async function scrapTab(tab: Browser.tabs.Tab) {
  if (tab && tab.id) {
    console.debug("Background - Scraping post from active tab ", {
      tabId: tab.id,
      url: tab.url,
    });
    const contentScriptClient = new ScrapingContentScriptClient(tab.id);
    const result = await contentScriptClient.scrapPost();
    if (result.type === "success") {
      await submitClassificationRequestForPost(result.postSnapshotId);
    } else {
      console.error("Scraping failed", result.message);
    }
  }
}
