import { TabScreenshotResult } from "../background/screenshot-sender-tab";
import { TAB_SCREENSHOT_MSG } from "../message";

export async function captureTabScreenshotAsDataUrl(): Promise<string> {
  const result = (await browser.runtime.sendMessage(
    TAB_SCREENSHOT_MSG,
  )) as TabScreenshotResult;
  if (typeof result === "string") {
    return result;
  }
  throw new Error(result.error);
}
