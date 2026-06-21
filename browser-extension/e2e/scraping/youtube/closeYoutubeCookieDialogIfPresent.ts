import { waitForCondition } from "@@/e2e/utils/waitForCondition";
import { Page } from "@playwright/test";

export async function closeYoutubeCookieDialogIfPresent(postPage: Page) {
  const cookieDialogClosed =
    (await waitForCondition({
      condition: async () => await doCloseCookieDialogIfPresent(postPage),
      timeout: 3000,
    })) === "condition-matched";
  if (cookieDialogClosed) {
    console.info("[E2E] Found and closed cookie dialog");
  } else {
    console.info("[E2E] Cookie dialog not found after timeout");
  }
}

export async function doCloseCookieDialogIfPresent(
  youtubePage: Page,
): Promise<boolean> {
  const closeCookieDialogButton = youtubePage
    .getByRole("button")
    .filter({ hasText: /Reject all|Tout refuser/, visible: true });
  if ((await closeCookieDialogButton.count()) > 0) {
    await closeCookieDialogButton?.click();
    return true;
  }
  return false;
}
