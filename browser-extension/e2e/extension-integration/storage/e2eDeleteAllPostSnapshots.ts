import type { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "../evaluate/evaluateInBackgroundWorker";

export async function e2eDeleteAllPostSnapshots(
  context: BrowserContext,
): Promise<void> {
  const clearPostStorage = async () => {
    const keys = (await browser.storage.local.getKeys()).filter(
      (key) => key === "posts" || key.startsWith("post-snapshots:v2:"),
    );
    await browser.storage.local.remove(keys);
  };
  await evaluateInBackgroundWorker(context, clearPostStorage);
}
