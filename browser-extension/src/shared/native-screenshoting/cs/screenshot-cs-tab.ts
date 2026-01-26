import { TAB_SCREENSHOT_MSG } from "../message";

export async function captureTabScreenshotAsDataUrl(): Promise<string> {
  return await browser.runtime.sendMessage(TAB_SCREENSHOT_MSG);
}
