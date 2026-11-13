import { decodePng, encodePng, type Image } from "image-js";
import { captureTabScreenshotAsDataUrl } from "../../tab/captureTabScreenshotAsDataUrl";
import type { ScreenshotFragment } from "./ScreenshotFragment";
import type { ScrapingSupport } from "../../../scraping/ScrapingSupport";
import { base64ToUint8Array } from "@/shared/utils/base-64";
import { extractBase64DataFromDataUrl } from "@/shared/utils/data-url";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { maybeStoreDebugScreenshot } from "../debug/debugScreenshots";
import { createLogger } from "../../../utils/createLogger";
import type { Scrollable } from "./Scrollable";
import { sleep } from "../../../utils/sleep";
import type { Size } from "../../box/Size";
import type { Box } from "../../box/Box";
import { withRetry } from "@/shared/utils/withRetry";

const logger = createLogger("capture-screenshot");

export type ScrollableScreenshot = {
  /** PNG fragments, positioned in the scrollable element's CSS coordinates. */
  fragments: ScreenshotFragment[];
};

export type ScreenshotWaitOptions = {
  waitForScrollEnd?: boolean;
  waitForIdle?: boolean;
  extraWait?: number;
};

// Default wait options allowing screenshot to reflect real state of page
export const defaultWaitOptions: Required<ScreenshotWaitOptions> = {
  // Wait scroll end
  waitForScrollEnd: true,
  // Wait idle dosn't seem to help in our test
  waitForIdle: false,
  // Extra wait is needed even with waitForScrollEnd.
  // This is probably to make sure browser had time to render before screenshot
  extraWait: 300,
};

export class ScreenshotAreaOutsideScrollSize extends Error {
  constructor(screenshotArea: Box, scrollSize: Size) {
    super(
      "Screenshoting failed: ScreenshotAreaOutsideScrollSize screenshotArea " +
        JSON.stringify(screenshotArea) +
        " scrollSize: " +
        JSON.stringify(scrollSize) +
        ".",
    );
  }
}

/**
 * Captures a scrollable element. When provided, `screenshotArea` limits the
 * capture to that rectangle in the scrollable element's CSS coordinates.
 */
export async function captureScrollableScreenshot(
  scrollableElement: Scrollable,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
  requestedScreenshotArea: Box,
  customWaitOptions?: ScreenshotWaitOptions,
): Promise<ScrollableScreenshot> {
  const resolvedWaitOptions: Required<ScreenshotWaitOptions> = {
    waitForScrollEnd:
      customWaitOptions?.waitForScrollEnd === undefined
        ? defaultWaitOptions.waitForScrollEnd
        : customWaitOptions?.waitForScrollEnd,
    waitForIdle:
      customWaitOptions?.waitForIdle === undefined
        ? defaultWaitOptions.waitForIdle
        : customWaitOptions?.waitForIdle,
    extraWait:
      customWaitOptions?.extraWait === undefined
        ? defaultWaitOptions.extraWait
        : customWaitOptions?.extraWait,
  };
  logger.debug(
    "Capture Scrollable Screenshot - ",
    "scrollableElementClientBoxSize",
    scrollableElement.getClientBoxInViewport(),
    "scrollableElementScrollSize",
    scrollableElement.getScrollSize(),
    "requestedScreenshotArea",
    requestedScreenshotArea,
    "customWaitOptions",
    customWaitOptions,
    "resolvedWaitOptions",
    resolvedWaitOptions,
  );

  const clientBox = scrollableElement.getClientBoxInViewport();
  const expectedFragmentsCount =
    Math.ceil(requestedScreenshotArea.height / clientBox.height) *
    Math.ceil(requestedScreenshotArea.width / clientBox.width);
  const progressPerFragment = 100 / expectedFragmentsCount;
  const fragments: ScreenshotFragment[] = [];
  const screenshotBottom =
    requestedScreenshotArea.y + requestedScreenshotArea.height;
  const screenshotRight =
    requestedScreenshotArea.x + requestedScreenshotArea.width;
  let nextTop = requestedScreenshotArea.y;

  while (nextTop < screenshotBottom) {
    let nextLeft = requestedScreenshotArea.x;
    let rowBottom = screenshotBottom;
    while (nextLeft < screenshotRight) {
      scrapingSupport.throwIfAborted();
      checkScreenshotAreaValid(
        requestedScreenshotArea,
        scrollableElement.getScrollSize(),
      );
      const scrollSize = scrollableElement.getScrollSize();
      const clientBox = scrollableElement.getClientBoxInViewport();
      const requestedTop = Math.min(
        nextTop,
        maxReachableScrollTop(scrollableElement),
      );
      const requestedLeft = Math.min(
        nextLeft,
        Math.max(0, scrollSize.width - clientBox.width),
      );
      const { visibleArea, scrollableScreenshot } =
        await captureScrollableVisibleAreaScreenshotWithRetry(
          scrollableElement,
          scrapingSupport,
          requestedTop,
          requestedLeft,
          resolvedWaitOptions,
        );
      const remainingArea: Box = {
        x: nextLeft,
        y: nextTop,
        width: screenshotRight - nextLeft,
        height: rowBottom - nextTop,
      };
      const capturedArea = intersectRects(visibleArea, remainingArea);
      if (!capturedArea) {
        throw new Error(
          `The visible area does not intersect the screenshot area.
  visibleArea:${JSON.stringify(visibleArea)}
  remainingArea${JSON.stringify(remainingArea)}`,
        );
      }
      const fragmentImage = cropImageToArea(
        scrollableScreenshot,
        visibleArea,
        capturedArea,
      );
      await maybeStoreDebugScreenshot(fragmentImage, {
        type: "scrollable-fragment-requested-area",
        desc: `scrollTop:${requestedTop}, scrollLeft:${requestedLeft}`,
      });
      fragments.push({
        catpureArea: capturedArea,
        screenshotPng: encodePng(fragmentImage),
      });
      progressManager.setProgress(fragments.length * progressPerFragment);
      nextLeft = capturedArea.x + capturedArea.width;
      rowBottom = Math.min(rowBottom, capturedArea.y + capturedArea.height);
    }
    nextTop = rowBottom;
  }
  return { fragments: fragments };
}

type ScrollableVisibleAreaScreenshot = {
  visibleArea: Box;
  scrollableScreenshot: Image;
};

/**
 * Captures the currently visible part of the scrollableElement.
 * Ensuiring it's
 * @returns
 */
async function captureScrollableVisibleAreaScreenshotWithRetry(
  scrollableElement: Scrollable,
  scrapingSupport: ScrapingSupport,
  requestedTop: number,
  requestedLeft: number,
  waitOptions: Required<ScreenshotWaitOptions>,
): Promise<ScrollableVisibleAreaScreenshot> {
  return withRetry({
    maxAttempts: 10,
    retryOn: (error) =>
      error instanceof ScrollableElementScrolledDuringScreenshotException ||
      error instanceof
        ScrollableElementClientBoxChangedDuringScreenshotException ||
      error instanceof TabSizeChangedDuringScreenshotError,
    beforeRetry: async ({ latestError, remainingAttempts }) => {
      logger.warn(
        "Error: ",
        (
          latestError as
            | ScrollableElementScrolledDuringScreenshotException
            | ScrollableElementClientBoxChangedDuringScreenshotException
            | TabSizeChangedDuringScreenshotError
        ).message,
        ". Retrying current fragment in 2s, " +
          remainingAttempts +
          " attempts remaining.",
      );
      await scrapingSupport.sleep(2000);
    },
    retry: async () => {
      await scrollableElement.scrollTo({
        top: requestedTop,
        left: requestedLeft,
        waitForScrollEnd: waitOptions.waitForScrollEnd,
      });

      if (waitOptions.waitForIdle) {
        await waitIdleOrTimeout(5000);
      }

      if (waitOptions.extraWait > 0) {
        await sleep(waitOptions.extraWait);
      }
      const settledPosition = scrollableElement.getScrollPosition();
      const settledScrollTop = settledPosition.top;
      const settledScrollLeft = settledPosition.left;

      logger.debug(
        "Capture Fragment - requestedTop:",
        requestedTop,
        "settledScrollTop:",
        settledScrollTop,
      );
      // Ensure scrollableElement is fully visible
      await scrollableElement.scrollIntoViewIfNeededAndEnsureVisible();
      const beforeCaptureClientBox = scrollableElement.getClientBoxInViewport();
      const beforeCaptureTabInnerSize: Size = tabInnerSize();

      if (
        // Due to various rounding details settledScrollTop could differ from requestedTop by 1 pixel
        // 1. Reason 1 scrollTop is a non-rounded number  while scrollHeight and clientHeight are rounded
        //   so when scrolled to bottom there may be some rounding settledScrollTop === requestedTop
        // See https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#determine_if_an_element_has_been_totally_scrolled
        // 2. browser snaps to physical pixels but when zoom != 1 this means scrollTop can be rounded to other values
        Math.abs(settledScrollTop - requestedTop) > 1
      ) {
        // User scroll detected
        throw new ScrollableElementScrolledDuringScreenshotException(
          requestedTop,
          settledScrollTop,
        );
      }
      if (Math.abs(settledScrollLeft - requestedLeft) > 1) {
        throw new ScrollableElementScrolledDuringScreenshotException(
          requestedLeft,
          settledScrollLeft,
          "scrollLeft",
        );
      }
      const tabImageDataUrl = await captureTabScreenshotAsDataUrl();

      const afterScreenshotPosition = scrollableElement.getScrollPosition();
      const afterScreenshotScrollTop = afterScreenshotPosition.top;
      if (settledScrollLeft !== afterScreenshotPosition.left) {
        throw new ScrollableElementScrolledDuringScreenshotException(
          settledScrollLeft,
          afterScreenshotPosition.left,
          "scrollLeft",
        );
      }
      if (settledScrollTop !== afterScreenshotScrollTop) {
        throw new ScrollableElementScrolledDuringScreenshotException(
          settledScrollTop,
          afterScreenshotScrollTop,
        );
      }
      const afterCaptureClientBox = scrollableElement.getClientBoxInViewport();
      assertClientBoxDidntChange(afterCaptureClientBox, beforeCaptureClientBox);
      const afterCaptureTabInnerSize: Size = tabInnerSize();
      assertTabInnerSizeDidntChange(
        afterCaptureTabInnerSize,
        beforeCaptureTabInnerSize,
      );
      const tabImage: Image = decodePng(
        base64ToUint8Array(extractBase64DataFromDataUrl(tabImageDataUrl)),
      );

      await maybeStoreDebugScreenshot(tabImage, {
        type: "tab-image",
        desc: "scrollTop:" + requestedTop,
      });

      const scrollableScreenshot = cropViewportImageToScrollable(
        tabImage,
        afterCaptureTabInnerSize,
        afterCaptureClientBox,
      );
      await maybeStoreDebugScreenshot(scrollableScreenshot, {
        type: "scrollable-fragment",
        desc: "scrollTop:" + requestedTop,
      });

      const visibleArea: Box = {
        x: requestedLeft,
        y: requestedTop,
        width: afterCaptureClientBox.width,
        height: afterCaptureClientBox.height,
      };
      return { visibleArea, scrollableScreenshot };
    },
  });
}

function cropViewportImageToScrollable(
  tabImage: Image,
  tabInnerSize: Size,
  scrollableBox: Box,
): Image {
  return cropImageToArea(
    tabImage,
    {
      x: 0,
      y: 0,
      width: tabInnerSize.width,
      height: tabInnerSize.height,
    },
    scrollableBox,
  );
}

function intersectRects(first: Box, second: Box): Box | undefined {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  if (right <= left || bottom <= top) return undefined;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function cropImageToArea(image: Image, imageArea: Box, cropArea: Box): Image {
  if (
    imageArea.width === cropArea.width &&
    imageArea.height === cropArea.height &&
    imageArea.x === cropArea.width &&
    imageArea.y === cropArea.height
  ) {
    // image exactly matches cropArea
    // No need to crop
    return image;
  }
  const scaleX = image.width / imageArea.width;
  const scaleY = image.height / imageArea.height;
  return image.crop({
    origin: {
      column: Math.floor((cropArea.x - imageArea.x) * scaleX),
      row: Math.floor((cropArea.y - imageArea.y) * scaleY),
    },
    width: Math.floor(cropArea.width * scaleX),
    height: Math.floor(cropArea.height * scaleY),
  });
}

async function waitIdleOrTimeout(timeout: number) {
  await new Promise((resolve) => {
    const requestTime = Date.now();
    requestIdleCallback(
      (deadline: IdleDeadline) => {
        const runTime = Date.now();
        if (deadline.didTimeout) {
          logger.warn(
            "requestIdleCallback didTimeout:",
            deadline.didTimeout,
            " took:",
            runTime - requestTime,
            "ms to schedule",
          );
        } else {
          logger.debug(
            "requestIdleCallback took:",
            runTime - requestTime,
            "ms to schedule",
          );
        }
        resolve(undefined);
      },
      {
        timeout: timeout,
      },
    );
  });
}

function assertClientBoxDidntChange(
  currentClientBox: Box,
  previousClientBox: Box,
) {
  if (
    currentClientBox.height != previousClientBox.height ||
    currentClientBox.width != previousClientBox.width ||
    currentClientBox.x != previousClientBox.x ||
    currentClientBox.y != previousClientBox.y
  ) {
    throw new ScrollableElementClientBoxChangedDuringScreenshotException();
  }
}

function assertTabInnerSizeDidntChange(
  currentTabSize: Size,
  previousTabSize: Size,
) {
  if (
    currentTabSize.height != previousTabSize.height ||
    currentTabSize.width != previousTabSize.width
  ) {
    throw new TabSizeChangedDuringScreenshotError();
  }
}

class TabSizeChangedDuringScreenshotError extends Error {
  constructor() {
    super("Screenshoting failed: tab size changed during screenshot.");
  }
}
class ScrollableElementClientBoxChangedDuringScreenshotException extends Error {
  constructor() {
    super(
      "Screenshoting failed: scrollable client box changed during screenshot.",
    );
  }
}

class ScrollableElementScrolledDuringScreenshotException extends Error {
  constructor(oldTopValue: number, newTopValue: number, axis = "scrollTop") {
    super(
      `Screenshoting failed: ${axis} changed during screenshot. from: ` +
        oldTopValue +
        " to: " +
        newTopValue +
        " during screenshot. Did user scroll?",
    );
  }
}

function tabInnerSize(): Size {
  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

function maxReachableScrollTop(scrollableElement: Scrollable) {
  return Math.max(
    0,
    scrollableElement.getScrollSize().height -
      scrollableElement.getClientBoxInViewport().height,
  );
}

function checkScreenshotAreaValid(area: Box, scrollSize: Size): Box {
  if (
    area.x < 0 ||
    area.y < 0 ||
    area.x + area.width > scrollSize.width ||
    area.y + area.height > scrollSize.height
  ) {
    throw new ScreenshotAreaOutsideScrollSize(area, scrollSize);
  }
  return area;
}
