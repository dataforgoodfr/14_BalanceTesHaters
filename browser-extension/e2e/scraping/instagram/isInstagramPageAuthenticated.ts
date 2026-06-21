import { Page } from "@playwright/test";

export async function isInstagramPageAuthenticated(
  instagramPage: Page,
): Promise<boolean> {
  return (
    (await instagramPage
      .locator("a", { hasText: /Log In|Se connecter/ })
      .count()) === 0
  );
}
