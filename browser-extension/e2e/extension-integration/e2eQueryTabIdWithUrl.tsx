import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "./evaluate/evaluateInBackgroundWorker";

export async function e2eQueryTabIdWithUrl(
  tabUrl: string,
  context: BrowserContext,
): Promise<number> {
  const linkedTab = await evaluateInBackgroundWorker<Browser.tabs.Tab>(
    context,
    async (tabUrl: string) => {
      console.log("Popup - Querying to tab with url " + tabUrl);
      const url = URL.parse(tabUrl)!;
      // Remove search param
      url.search = "";
      // Add wildcard
      const urlPattern = url.toString() + "*";
      const queryOptions = { url: urlPattern };
      const tabs = await browser.tabs.query(queryOptions);
      if (tabs.length === 0) {
        throw new Error("Popup - Couldn't find a tab with url: " + tabUrl);
      }
      return tabs[0];
    },
    tabUrl,
  );

  const linkedTabId = linkedTab?.id;
  if (!linkedTabId) {
    throw new Error("[E2E] Failed to find a tab for url:" + tabUrl);
  } else {
    console.log("[E2E] Tab id for url:", tabUrl, " is ", linkedTabId);
    return linkedTabId;
  }
}
