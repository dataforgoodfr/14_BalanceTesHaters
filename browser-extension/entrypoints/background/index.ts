import { storePost } from "../shared/storage/posts-storage";
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
    console.log("Scraping post from active tab");
    const socialNetworkPost = await scrapPostFromTab(tab);
    console.log("Storing post to local storage");
    await storePost(socialNetworkPost);
  }
}
