import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { ScrapingSucceeded } from "@/shared/scraping-content-script/ScrapingStatus";
import { BrowserContext, Page, TestInfo } from "@playwright/test";
import { e2eWaitForScrapingSuccess } from "./e2eWaitForScrapingSuccess";
import { triggerPageScrappingAndWaitForRunning } from "./e2eTriggerPageScrapping";

export type E2EScrapPostResult = {
  postUrl: string;
  postPage: Page;
  postTabId: number;
  authenticated?: boolean;
  scrapingStatus: ScrapingSucceeded;
  postSnapshot: PostSnapshot;
};

export async function e2eScrapPost({
  postUrl,
  openAndPreparePage,
  detectAuthenticated,
  context,
  extensionId,
  testInfo,
  pageSetupTimeout = 10000,
  scrapingTimeout = 60000,
  afterScrappingTestTimeout = 10000,
}: {
  postUrl: string;
  /**
   * Prepare page after open (ensure loading, close cookie dialog)
   * @param page
   * @returns
   */
  openAndPreparePage: (
    postUrl: string,
    context: BrowserContext,
  ) => Promise<Page>;
  detectAuthenticated?: (
    page: Page,
    context: BrowserContext,
  ) => Promise<boolean>;

  extensionId: string;
  testInfo: TestInfo;
  context: BrowserContext;

  /** Timeout for page setup (open+prepare + detect Login= */
  pageSetupTimeout?: number;
  /**
   * Timeout for page scrapping
   */
  scrapingTimeout?: number;
  /** Timeout for phase after scrapping end */
  afterScrappingTestTimeout?: number;
}): Promise<E2EScrapPostResult> {
  const start = Date.now();
  testInfo.setTimeout(pageSetupTimeout);

  console.info("[E2E] Opening and preparing page (url " + postUrl + ") ...");
  const postPage: Page = await openAndPreparePage(postUrl, context);
  console.info("[E2E] Post page ready.");

  const authenticated = detectAuthenticated
    ? await detectAuthenticated(postPage, context)
    : undefined;
  console.info("[E2E] Post page authenticated:", authenticated);

  const pageScrappingStart = Date.now();
  testInfo.setTimeout(pageScrappingStart - start + scrapingTimeout);
  const triggerResult = await triggerPageScrappingAndWaitForRunning({
    postPage,
    context,
    extensionId,
    waitForScrappingRunningTimeout: scrapingTimeout,
  });

  const scrapingSuccess = await e2eWaitForScrapingSuccess(
    context,
    triggerResult.postTabId,
    scrapingTimeout,
  );

  const pageScrappingEnd = Date.now();

  testInfo.setTimeout(pageScrappingEnd - start + afterScrappingTestTimeout);

  return {
    postUrl,
    postPage,
    postTabId: triggerResult.postTabId,
    authenticated,
    scrapingStatus: scrapingSuccess.status,
    postSnapshot: scrapingSuccess.postSnapshot,
  };
}
