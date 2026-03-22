import { withRetry } from "@/shared/utils/withRetry";
import { sleep } from "../../utils/sleep";

export type TabScreenshotResult = string | { error: string };

export async function screenshotSenderTab(
  sender: Browser.runtime.MessageSender,
): Promise<TabScreenshotResult> {
  try {
    const tabWindowId = sender.tab?.windowId;
    const tabId = sender.tab?.id;
    if (!tabWindowId) {
      throw new Error("Sender has no window Id");
    }
    if (!tabId) {
      throw new Error("Sender has no tab Id");
    }

    return await withRetry({
      maxAttempts: 10,
      retryOn: (e) =>
        isMaxCaptureVisibleTabCallsError(e) ||
        isCannotEditTabError(e) ||
        e instanceof SenderTabNotActiveAfterScreenshotError,
      beforeRetry: async ({ latestError, remainingAttempts }) => {
        console.warn(
          "Screenshoting error:",
          latestError,
          " - Retrying... ",
          remainingAttempts,
          " remaining attempts",
        );
        await sleep(500);
      },
      retry: async () => {
        await browser.tabs.update(tabId, { active: true });

        const screenshotDataUrl = await browser.tabs.captureVisibleTab(
          tabWindowId,
          {
            format: "png",
          },
        );
        const tabStatus = await browser.tabs.get(tabId);
        if (tabStatus.active) {
          return screenshotDataUrl;
        } else {
          throw new SenderTabNotActiveAfterScreenshotError();
        }
      },
    });
  } catch (e) {
    console.error("Screenshoting error:", e);
    return {
      error: String(e),
    };
  }
}

class SenderTabNotActiveAfterScreenshotError extends Error {}

function isCannotEditTabError(e: unknown): boolean {
  return (
    e instanceof Error &&
    e.message.includes(
      "Tabs cannot be edited right now (user may be dragging a tab).",
    )
  );
}

function isMaxCaptureVisibleTabCallsError(e: unknown): boolean {
  return (
    e instanceof Error &&
    e.message.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND")
  );
}
