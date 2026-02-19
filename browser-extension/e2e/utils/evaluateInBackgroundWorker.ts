import { BrowserContext } from "@playwright/test";

export async function evaluateInBackgroundWorker<T>(
  context: BrowserContext,
  // eslint-disable-next-line
  bgFunction: (arg?: any) => T | Promise<T>,
  // eslint-disable-next-line
  arg?: any,
): Promise<T> {
  const backgroundWorker = context.serviceWorkers()[0];

  return await backgroundWorker.evaluate(bgFunction, arg);
}
