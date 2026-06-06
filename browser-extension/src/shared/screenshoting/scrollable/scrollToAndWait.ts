import { Position, ScrollableScrollToOptions, logger } from "./Scrollable";

export async function scrollToAndWait(
  scrollable: Window | HTMLElement,
  scrollEndEventSource: Document | HTMLElement,
  currentScrollPosition: Position,
  scrollableScrollToOptions: ScrollableScrollToOptions,
): Promise<void> {
  logger.debug("scrolling to: ", scrollableScrollToOptions);
  if (
    (scrollableScrollToOptions.top !== undefined &&
      scrollableScrollToOptions.top !== currentScrollPosition.top) ||
    (scrollableScrollToOptions.left !== undefined &&
      scrollableScrollToOptions.left !== currentScrollPosition.left)
  ) {
    const { waitForScrollEnd = true, ...scrollToOptions } =
      scrollableScrollToOptions;

    if (waitForScrollEnd) {
      await new Promise((resolve) => {
        const listener: EventListener = (event) => {
          resolve(event);
          scrollEndEventSource.removeEventListener("scrollend", listener);
          logger.debug("scrollend received: ", event);
        };
        scrollEndEventSource.addEventListener("scrollend", listener);
        scrollable.scrollTo(scrollToOptions);
      });
    } else {
      scrollable.scrollTo(scrollToOptions);
    }
  } else {
    logger.debug("Already on target. Scrolling skipped .");
  }
}
