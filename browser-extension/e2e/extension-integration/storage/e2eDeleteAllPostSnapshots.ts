import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "../evaluate/evaluateInBackgroundWorker";

export async function e2eDeleteAllPostSnapshots(
  context: BrowserContext,
): Promise<void> {
  const clearPostStorage = async () => {
    await browser.storage.local.remove("posts");
  };
  await evaluateInBackgroundWorker(context, clearPostStorage);
}
