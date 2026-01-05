import { getCurrentTab } from "../shared/getCurrentTab";
import { testPuppeteer } from "./testPuppeteer";
export default defineBackground(() => {
  console.log("Hello background!", { extensionId: browser.runtime.id });

  async function handleMessages(message: any, sender: any, sendResponse: any) {
    console.log("message received:", message, sender);

    const tab = await getCurrentTab();

    if (tab?.id) {
      await testPuppeteer(tab.id);
    }
  }
  console.log("registering listener");
  browser.runtime.onMessage.addListener(handleMessages);
});
