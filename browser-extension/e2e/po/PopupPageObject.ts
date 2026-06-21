import { Page, BrowserContext, Locator } from "@playwright/test";
import { e2eQueryTabIdWithUrl } from "../extension-integration/e2eQueryTabIdWithUrl";

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
    const linkedTabId = await e2eQueryTabIdWithUrl(linkedTabUrl, context);

    return await PopupPageObject.open(extensionId, context, linkedTabId);
  }

  viewAnalysisButton(): Locator {
    return this.page.getByTestId("view-analyses-button");
  }

  startScrapingButton(): Locator {
    return this.page.getByTestId("start-scraping-button");
  }

  async clickStartScrapingButton(): Promise<void> {
    const startScrapingButton = this.startScrapingButton();
    await startScrapingButton.waitFor({ state: "visible", timeout: 15000 });
    if (!(await startScrapingButton.isEnabled())) {
      throw new Error("Start scraping button is disabled.");
    }
    console.log("[E2E] PopupPageObject - Clicking start scraping button");
    await startScrapingButton.click();
  }
}
function popupUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/popup.html`;
}
function popupUrlLinkedToTabId(extensionId: string, tabId: number): string {
  const url = URL.parse(popupUrl(extensionId));
  if (!url) {
    throw new Error("Invalid url");
  }
  url.hash = "#" + tabId;
  return url.toString();
}
