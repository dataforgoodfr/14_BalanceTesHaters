import { ElementHandle } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";

export async function innerHtml(element: ElementHandle): Promise<string> {
  return await element.evaluate((e) => (e as HTMLElement).innerHTML, element);
}
