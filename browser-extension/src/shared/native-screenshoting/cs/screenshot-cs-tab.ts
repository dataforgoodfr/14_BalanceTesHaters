import { type TabScreenshotResult } from "../background/screenshot-sender-tab";
import { TAB_SCREENSHOT_MSG, type TabScreenshotMessage } from "../message";

export async function captureTabScreenshotAsDataUrl(): Promise<string> {
  const result = await browser.runtime.sendMessage<
    TabScreenshotMessage,
    TabScreenshotResult
  >(TAB_SCREENSHOT_MSG);

  if (typeof result === "string") {
    return result;
  }
  throw new Error(result.error);
}
