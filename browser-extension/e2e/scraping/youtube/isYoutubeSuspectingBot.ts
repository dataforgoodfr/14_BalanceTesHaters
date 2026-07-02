import { Page } from "@playwright/test";

export async function isYoutubeSuspectingBot(page: Page): Promise<boolean> {
  return (
    (await page.getByText("not a bot").count()) > 0 ||
    (await page.getByText("pas un robot").count()) > 0
  );
}
