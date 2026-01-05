import { getCurrentTab } from "../shared/utils/getCurrentTab";
import { scrapTab as scrapPostFromTab } from "./scraping/scrap-tab";

export default defineBackground(() => {
  console.log("Hello background!", { extensionId: browser.runtime.id });

  async function handleMessages(
    message: Message,
    sender: any,
    sendResponse: any
  ) {
    console.debug("Message received:", message, sender);

    switch (message.msgType) {
      case "scrap-active-tab":
        scrapActiveTab();
    }
  }
  console.log("registering listener");
  browser.runtime.onMessage.addListener(handleMessages);
});

async function scrapActiveTab() {
  const tab = await getCurrentTab();

  if (tab) {
    const socialNetworkPost = await scrapPostFromTab(tab);

    if (socialNetworkPost.comments.length > 0) {
      const screenshotDataUrl: string =
        socialNetworkPost.comments[0].screenshotDataUrl;
      browser.downloads.download({
        url: screenshotDataUrl, // The object URL can be used as download URL
        filename: "screenshot.png",
        //...
      });
    }
  }
}
