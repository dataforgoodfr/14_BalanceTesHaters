import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "./evaluateInBackgroundWorker";

export async function findTabIdForUrl(
  context: BrowserContext,
  tabUrl: string,
): Promise<number | undefined> {
  return await evaluateInBackgroundWorker<number | undefined>(
    context,
    async (tabUrl) => {
      console.log("finding tab id with url:" + tabUrl);
      const queryOptions = { url: tabUrl };
      const [tab] = await browser.tabs.query(queryOptions);
      return tab.id;
    },
    tabUrl,
  );
}
