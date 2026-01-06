import { ElementHandle } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";

export async function anchorHref(
  element: ElementHandle<HTMLAnchorElement>
): Promise<string> {
  return await element.evaluate((e) => e.href, element);
}
