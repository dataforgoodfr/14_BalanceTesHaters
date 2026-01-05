import { getCurrentTab } from "../shared/getCurrentTab";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  async function handleMessages(message: any, sender: any, sendResponse: any) {
    console.log("message received:", message, sender);

    const tab = await getCurrentTab();
    console.log("tab:", tab);
  }
  console.log("registering listener");
  browser.runtime.onMessage.addListener(handleMessages);
});
