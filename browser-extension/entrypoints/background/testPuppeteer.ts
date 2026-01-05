import {
  connect,
  ExtensionTransport,
  type ElementHandle,
} from "puppeteer-core/internal/puppeteer-core-browser.js";

export async function testPuppeteer(tabId: number) {
  console.log("connecting puppeteer");
  const browser = await connect({
    transport: await ExtensionTransport.connectTab(tabId),
  });
  const [page] = await browser.pages();
  console.log("puppeteer page acquired", page);
  const commentsSectionHandle: ElementHandle = (await page.$("#comments"))!;
  console.log("commentsSectionHandle", commentsSectionHandle);
  console.log("disconnecting");
  browser.disconnect();
}
