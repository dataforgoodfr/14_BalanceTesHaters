import { ScrapingStatus } from "@/shared/scraping-content-script/ScrapingStatus";
import { BrowserContext } from "@playwright/test";
import {
  evaluateInBackgroundWorker,
  NoBackgroundWorker,
} from "../evaluate/evaluateInBackgroundWorker";
import { ScsGetScrapingStatusMessage } from "@/shared/scraping-content-script/messages";

export async function e2eGetScrapingStatus(
  context: BrowserContext,
  scrapingTabId: number,
): Promise<ScrapingStatus> {
  const evaluationFn = async (scrapingTabId: number) => {
    // Note that we cannot use constants or references to external code in evaluationFn
    return await browser.tabs.sendMessage<
      ScsGetScrapingStatusMessage,
      ScrapingStatus
    >(scrapingTabId, {
      msgType: "scs-get-scraping-status",
    });
  };

  const scrapingStatus: ScrapingStatus =
    await evaluateInBackgroundWorker<ScrapingStatus>(
      context,
      evaluationFn,
      scrapingTabId,
    );
  return scrapingStatus;
}

/**
 * Get scraping status or undefined if no content script response
 * @param context
 * @param scrapingTabId
 * @returns
 */
export async function e2eGetScrapingStatusOrUndefinedIfNoCS(
  context: BrowserContext,
  scrapingTabId: number,
): Promise<ScrapingStatus | undefined> {
  try {
    return await e2eGetScrapingStatus(context, scrapingTabId);
  } catch (e) {
    if (e instanceof NoBackgroundWorker) {
      throw e;
    } else {
      return undefined;
    }
  }
}
