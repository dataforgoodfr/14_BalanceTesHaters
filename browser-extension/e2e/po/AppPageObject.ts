import type { BrowserContext, Page } from "@playwright/test";

export class AppPageObject {
  private constructor(readonly page: Page) {}

  static async open(
    extensionId: string,
    context: BrowserContext,
    route = "/",
  ): Promise<AppPageObject> {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/posts.html#${route}`);
    return new AppPageObject(page);
  }

  async browseTo(menuEntry: "Vue d'ensemble" | "Publications analysées") {
    await this.page.getByRole("link", { name: menuEntry, exact: true }).click();
  }
}
