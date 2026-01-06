import { ElementHandle } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";

export async function ariaLabel(
  element: ElementHandle
): Promise<string | null> {
  return await element.evaluate((e) => (e as HTMLElement).ariaLabel, element);
}
