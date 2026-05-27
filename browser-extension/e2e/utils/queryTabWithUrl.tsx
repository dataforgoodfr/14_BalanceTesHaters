import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "./evaluateInBackgroundWorker";

export async function queryTabWithUrl(
  tabUrl: string,
  context: BrowserContext,
): Promise<Browser.tabs.Tab> {
  return await evaluateInBackgroundWorker<Browser.tabs.Tab>(
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
}
