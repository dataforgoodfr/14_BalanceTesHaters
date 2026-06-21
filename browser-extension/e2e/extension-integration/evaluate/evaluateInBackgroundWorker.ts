import { BrowserContext } from "@playwright/test";

export async function evaluateInBackgroundWorker<T>(
  context: BrowserContext,
  // eslint-disable-next-line
  bgFunction: (arg?: any) => T | Promise<T>,
  // eslint-disable-next-line
  arg?: any,
): Promise<T> {
  const backgroundWorker = context.serviceWorkers()[0];
  if (!backgroundWorker) {
    throw new NoBackgroundWorker();
  }
  return await backgroundWorker.evaluate(bgFunction, arg);
}

export class NoBackgroundWorker extends Error {
  constructor() {
    super(
      "Failed to find background worker. Extension setup probably failed or is already destroyed?",
    );
  }
}
