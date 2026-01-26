import { sleep } from "../../utils/sleep";

export async function screenshotSenderTab(
  sender: Browser.runtime.MessageSender,
): Promise<string> {
  const tabWindowId = sender.tab?.windowId;
  if (!tabWindowId) {
    throw new Error("Sender has no window Id");
  }
  let retries = 5;
  for (;;) {
    try {
      const screenshotDataUrl = await browser.tabs.captureVisibleTab(
        tabWindowId,
        {
          format: "png",
        },
      );
      return screenshotDataUrl;
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        e.message.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND") &&
        retries > 0
      ) {
        // handle retry on MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND  https://issues.chromium.org/issues/40764505
        retries--;
        await sleep(500);
      } else {
        throw e;
      }
    }
  }
}
