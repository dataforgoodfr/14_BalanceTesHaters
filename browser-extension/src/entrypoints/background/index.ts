import { isScrapTabMessage } from "./scraping/scrap-tab-message";
import { screenshotSenderTab } from "../../shared/native-screenshoting/background/screenshot-sender-tab";
import { isScreenshotSenderTab } from "../../shared/native-screenshoting/message";
import { submitClassificationRequestForPost } from "./classification/submitClassificationForPost";
import { isSubmitClassificationRequestMessage } from "./classification/submitClassificationForPostMessage";
import { isUpdatePostWithClassificationResultMessage } from "./classification/updatePostWithClassificationResultMessage";
import { updatePostWithClassificationResult } from "./classification/updatePostWithClassificationResult";
import { scrapTabAndSubmitClassificationRequest } from "./scraping/scrapTab";
import { startClassificationPolling } from "./classification/classificationPolling";

export default defineBackground(() => {
  console.info(
    "Background - Initializing background. Extension id is: ",
    browser.runtime.id,
  );

  console.debug("Background - Registering message listener");
  browser.runtime.onMessage.addListener(handleIncomingMessages);

  console.debug("Background - Register classification polling alarm");
  startClassificationPolling();
});

/**
 * Handles incoming messages from content scripts, popup, and other extension parts.
 * Dispatches messages to appropriate handlers based on message type.
 *
 * @param message - The message object received from the sender
 * @param sender - Information about the script that sent the message
 * @param sendResponse - Callback function to send response back to the sender
 * @returns boolean|undefined - Returns true if an async response will be sent using sendResponse undefined if message not handled (see web-ext messaging doc for more details).
 */
function handleIncomingMessages(
  message: unknown,
  sender: Browser.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): boolean | undefined {
  console.debug("Background - Message received:", message, sender);

  if (isScrapTabMessage(message)) {
    void scrapTabAndSubmitClassificationRequest(message.tabId).then(() =>
      sendResponse(undefined),
    );
    return true;
  } else if (isScreenshotSenderTab(message)) {
    void screenshotSenderTab(sender).then((result) => {
      sendResponse(result);
    });
    return true;
  } else if (isSubmitClassificationRequestMessage(message)) {
    void submitClassificationRequestForPost(message.postSnapshotId).then(
      () => {
        sendResponse({ success: true });
      },
      (error) => {
        console.error(error);
        sendResponse({ success: false });
      },
    );
    return true;
  } else if (isUpdatePostWithClassificationResultMessage(message)) {
    updatePostWithClassificationResult(message.postSnapshotId).then(
      () => {
        sendResponse({ success: true });
      },
      (error) => {
        console.error(error);
        sendResponse({ success: false });
      },
    );
    return true;
  }
}
