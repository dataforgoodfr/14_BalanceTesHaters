import { ElementHandle } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";

export async function anchorHref(element: ElementHandle): Promise<string> {
  const anchorElement: ElementHandle<HTMLAnchorElement> =
    await element.toElement("a");
  return await anchorElement.evaluate((e) => e.href);
}
