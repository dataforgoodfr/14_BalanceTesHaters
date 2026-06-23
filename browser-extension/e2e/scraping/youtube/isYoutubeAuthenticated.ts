import { Page } from "@playwright/test";

export async function isYoutubeAuthenticated(page: Page): Promise<boolean> {
  return (
    (await page
      .locator("a[aria-label='Sign in'],a[aria-label='Se connecter']")
      .count()) === 0
  );
}
