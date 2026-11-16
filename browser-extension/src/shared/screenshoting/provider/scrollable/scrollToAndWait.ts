import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import type { ScrollPosition, ScrollableScrollToOptions } from "./Scrollable";

const logger = createLogger("screenshoting-scrollToAndWait", scrapingLogger);

export async function scrollToAndWait(
  scrollable: Window | HTMLElement,
  scrollEndEventSource: Document | HTMLElement,
  currentScrollPosition: ScrollPosition,
  scrollableScrollToOptions: ScrollableScrollToOptions,
): Promise<void> {
  const {
    signal,
    waitForScrollEnd = true,
    ...scrollToOptions
  } = scrollableScrollToOptions;
  signal?.throwIfAborted();
  if (
    (scrollToOptions.top === undefined ||
      Math.abs(scrollToOptions.top - currentScrollPosition.top) < 1) &&
    (scrollToOptions.left === undefined ||
      Math.abs(scrollToOptions.left - currentScrollPosition.left) < 1)
  ) {
    return;
  }
  logger.debug("Scrolling for screenshot", scrollToOptions);
  if (!waitForScrollEnd) {
    scrollable.scrollTo(scrollToOptions);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      scrollEndEventSource.removeEventListener("scrollend", onScrollEnd);
      signal?.removeEventListener("abort", onAbort);
    };
    const onScrollEnd = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      const reason: unknown = signal?.reason;
      reject(
        reason instanceof Error
          ? reason
          : new Error("Scrolling aborted", { cause: reason }),
      );
    };
    scrollEndEventSource.addEventListener("scrollend", onScrollEnd);
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      scrollable.scrollTo(scrollToOptions);
    } catch (error) {
      cleanup();
      reject(
        error instanceof Error
          ? error
          : new Error("Scrolling failed", { cause: error }),
      );
    }
  });
}
