import { waitForCondition } from "@@/e2e/utils/waitForCondition";
import { BrowserContext, Page } from "@playwright/test";
import { isInstagramPageAuthenticated } from "./isInstagramPageAuthenticated";
import { OpenAndPrepareResult } from "../e2eScrapPost";

export async function openAndPrepareInstagramPage(
  postUrl: string,
  context: BrowserContext,
): Promise<OpenAndPrepareResult> {
  const postPage: Page = await context.newPage();
  await postPage.goto(postUrl, { waitUntil: "domcontentloaded" });
  console.info("[E2E] domcontentloaded.");

  console.info("[E2E] Waiting for content...");
  await postPage.waitForSelector("video,article", {
    state: "visible",
  });
  console.info("[E2E] Found instagram content");

  const cookieDialogClosed =
    (await waitForCondition({
      condition: async () => await closeCookieDialogIfPresent(postPage),
      timeout: 3000,
    })) === "condition-matched";
  if (cookieDialogClosed) {
    console.info("[E2E] Found and closed cookie dialog");
  } else {
    console.info("[E2E] Cookie dialog not found after timeout");
  }

  const loginDialogClosed =
    (await waitForCondition({
      condition: async () => await closeLoginDialogIfPresent(postPage),
      timeout: 3000,
    })) === "condition-matched";
  if (loginDialogClosed) {
    console.info("[E2E] Found and closed login dialog");
  } else {
    console.info("[E2E] Login dialog not found after timeout");
  }

  const authenticated = await isInstagramPageAuthenticated(postPage);
  return {
    postPage,
    authenticated,
    platformSuspectingBot: false,
  };
}

async function closeCookieDialogIfPresent(page: Page): Promise<boolean> {
  const closeCookieDialogButton = page.locator("button").filter({
    hasText: /Decline optional cookies|Refuser les cookies optionnels/,
    visible: true,
  });

  if ((await closeCookieDialogButton.count()) > 0) {
    console.debug("[E2E] Cookie Dialog found closing it");
    await closeCookieDialogButton.click();
    return true;
  }
  return false;
}

async function closeLoginDialogIfPresent(page: Page): Promise<boolean> {
  const loginDialog = page.getByRole("dialog").filter({
    hasText: /Log in|Se connecter/,
    visible: true,
  });

  if ((await loginDialog.count()) > 0) {
    console.debug("[E2E] Found login Dialog. Closing it");

    const closeLoginDialogButton = loginDialog.locator(
      "[aria-label='Fermer'],[aria-label='Close']",
    );
    await closeLoginDialogButton.click();
    return true;
  }
  return false;
}
