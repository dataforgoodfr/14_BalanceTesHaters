import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "./evaluateInBackgroundWorker";

export async function findTabIdForUrl(
  context: BrowserContext,
  tabUrl: string,
): Promise<number | undefined> {
  return await evaluateInBackgroundWorker<number | undefined>(
    context,
    async (tabUrl: string) => {
      const [tabExactMatch] = await browser.tabs.query({ url: tabUrl });
      if (tabExactMatch?.id) {
        return tabExactMatch.id;
      }

      try {
        const expectedUrl = new URL(tabUrl);
        const [activeTab] = await browser.tabs.query({
          active: true,
          url: `${expectedUrl.origin}/*`,
        });
        if (
          activeTab?.id &&
          typeof activeTab.url === "string" &&
          new URL(activeTab.url).pathname === expectedUrl.pathname
        ) {
          return activeTab.id;
        }

        const allTabsForOrigin = await browser.tabs.query({
          url: `${expectedUrl.origin}/*`,
        });
        const matchingTab = allTabsForOrigin.find((tab) => {
          if (!tab.url) return false;
          const candidateUrl = new URL(tab.url);
          return (
            candidateUrl.pathname === expectedUrl.pathname &&
            (expectedUrl.search.length === 0 ||
              candidateUrl.search.includes(expectedUrl.search))
          );
        });
        return matchingTab?.id;
      } catch {
        return undefined;
      }
    },
    tabUrl,
  );
}
