import { Page, BrowserContext, Locator } from "@playwright/test";
import { popupUrlLinkedToTabUrl, popupUrl } from "../utils/popupUrl";

export class PopupPageObject {
  constructor(public readonly page: Page) {}

  static async open(
    extensionId: string,
    context: BrowserContext,
    linkedTabUrl?: string,
  ): Promise<PopupPageObject> {
    const popupPage = await context.newPage();
    const url = linkedTabUrl
      ? popupUrlLinkedToTabUrl(extensionId, linkedTabUrl)
      : popupUrl(extensionId);
    await popupPage.goto(url);
    return new PopupPageObject(popupPage);
  }

  viewAnalysisButton(): Locator {
    return this.page.getByTestId("view-analysis-button");
  }

  startScrapingButton(): Locator {
    return this.page.getByTestId("start-scraping-button");
  }
}
