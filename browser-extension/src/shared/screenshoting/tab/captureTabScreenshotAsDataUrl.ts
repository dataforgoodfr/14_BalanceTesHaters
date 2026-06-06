import { type TabScreenshotResult } from "../../../entrypoints/background/screenshoting/screenshotSenderTab";
import {
  TAB_SCREENSHOT_MSG,
  type TabScreenshotMessage,
} from "../../../entrypoints/background";

/**
 * Request background script to capture screenshot of tab visible part.
 * @returns
 */
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
