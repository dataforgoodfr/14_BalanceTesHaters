import { Page } from "@playwright/test";

export async function isYoutubeAuthenticated(page: Page): Promise<boolean> {
  // login button is present when NOT authenticated
  const loginButtonLocator = page
    .locator("a[aria-label='Sign in'],a[aria-label='Se connecter']")
    .first();
  // avatar button is present  when authenticated
  const avatarButtonLocator = page.locator("button#avatar-btn");
  const combinedLocator = loginButtonLocator.or(avatarButtonLocator);
  const isAvatarButton =
    (await combinedLocator.evaluate((e) => e.id)) === "avatar-btn";
  return isAvatarButton;
}
