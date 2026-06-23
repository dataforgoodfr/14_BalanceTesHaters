import { Page, BrowserContext } from "@playwright/test";
import { PopupPageObject } from "../po/PopupPageObject";
import { e2eQueryTabIdWithUrl } from "../extension-integration/e2eQueryTabIdWithUrl";
import { waitForConditionOrThrow } from "../utils/waitForCondition";
import { e2eGetScrapingStatusOrUndefinedIfNoCS } from "../extension-integration/cs/e2eGetScrapingStatus";

export type TriggerScrapingResult = {
  popupPage: PopupPageObject;
  postTabId: number;
};

export async function triggerPageScrappingAndWaitForRunning({
  postPage,
  context,
  extensionId,
  waitForScrappingRunningTimeout,
}: {
  postPage: Page;
  context: BrowserContext;
  extensionId: string;
  waitForScrappingRunningTimeout: number;
}): Promise<TriggerScrapingResult> {
  const postPageUrl = postPage.url();
  console.log("[E2E] triggerPageScrapping for postPage with url:", postPageUrl);

  const postTabId = await e2eQueryTabIdWithUrl(postPageUrl, context);
  const popupPage = await PopupPageObject.open(extensionId, context, postTabId);
  await popupPage.page.bringToFront();

  await popupPage.clickStartScrapingButton();
  await postPage.bringToFront();
  await e2eWaitForScrapingStarted(
    waitForScrappingRunningTimeout,
    context,
    postTabId,
  );
  return {
    popupPage,
    postTabId,
  };
}

async function e2eWaitForScrapingStarted(
  timeout: number,
  context: BrowserContext,
  scrapingTabId: number,
) {
  await waitForConditionOrThrow({
    timeout,
    condition: async () => {
      const status = await e2eGetScrapingStatusOrUndefinedIfNoCS(
        context,
        scrapingTabId,
      );
      return status !== undefined && status.type !== "not-started";
    },
  });
}
