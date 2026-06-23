import { Page } from "@playwright/test";

export async function isYoutubeSuspectingBot(page: Page): Promise<boolean> {
  return (
    (await page.getByText("Sign in to confirm you're not a bot").count()) > 0 ||
    (await page
      .getByText("Connectez-vous pour confirmer que vous n'êtes pas un robot")
      .count()) > 0
  );
}
