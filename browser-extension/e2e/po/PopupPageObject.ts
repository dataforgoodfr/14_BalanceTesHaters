import { Page, BrowserContext, Locator } from "@playwright/test";
import { popupUrlLinkedToTabId, popupUrl } from "../utils/popupUrl";
import { queryTabWithUrl } from "../utils/queryTabWithUrl";

export class PopupPageObject {
  constructor(public readonly page: Page) {}

  static async open(
    extensionId: string,
    context: BrowserContext,
    linkedTabId?: number,
  ): Promise<PopupPageObject> {
    console.log("[E2E] PopupPageObject.open", "linkedTabUrl:", linkedTabId);
    const popupPage = await context.newPage();
    const url = linkedTabId
      ? popupUrlLinkedToTabId(extensionId, linkedTabId)
      : popupUrl(extensionId);
    console.log("[E2E] PopupPageObject.open", "goto:", url);
    await popupPage.goto(url);
    return new PopupPageObject(popupPage);
  }

  static async openLinkedToUrl(
    extensionId: string,
    context: BrowserContext,
    linkedTabUrl: string,
  ): Promise<PopupPageObject> {
    const linkedTab = await queryTabWithUrl(linkedTabUrl, context);

    const linkedTabId = linkedTab?.id;
    console.log("[E2E] postPage tabId :", linkedTab.id);
    if (!linkedTabId) {
      throw new Error(
        "[E2E] Failed to find tab for linkedTabUrl:" + linkedTabUrl,
      );
    }
    return await PopupPageObject.open(extensionId, context, linkedTabId);
  }

  viewAnalysisButton(): Locator {
    return this.page.getByTestId("view-analyses-button");
  }

  startScrapingButton(): Locator {
    return this.page.getByTestId("start-scraping-button");
  }
}
