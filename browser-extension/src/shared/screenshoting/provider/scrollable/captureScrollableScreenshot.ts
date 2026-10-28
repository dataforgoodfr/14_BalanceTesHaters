import { decodePng, encodePng, type CropOptions, type Image } from "image-js";
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

const logger = createLogger("capture-screenshot");

export type ScrollableScreenshot = {
  /** PNG fragments, positioned in the scrollable element's CSS coordinates. */
  fragments: ScreenshotFragment[];

  /**
   * Scrollable Element client size at screenshot time.
   * That is the size of the area where the screnshot is renderer in the viewport.
   * This allows caller to ensure that element size is still the same when using
   * screenshot if there is a need to extract sub elements screenshots.
   */
  clientSize: Size;
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

/**
 * Captures a scrollable element. When provided, `screenshotArea` limits the
 * capture to that rectangle in the scrollable element's CSS coordinates.
 */
export async function captureScrollableScreenshot(
  scrollableElement: Scrollable,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
  screenshotArea?: Box,
  customWaitOptions?: ScreenshotWaitOptions,
): Promise<ScrollableScreenshot> {
  logger.debug(
    "Capturing fragments...",
    "customWaitOptions",
    customWaitOptions,
  );

  return await captureElementScreenshotFragments(
    scrollableElement,
    scrapingSupport,
    progressManager,
    screenshotArea,
    customWaitOptions,
  );
}

export class ScrollableElementClientSizeChangedException extends Error {
  constructor() {
    super(
      "Screenshoting failed: element client size changed during screenshot.",
    );
  }
}

export class ScrollableElementScrollSizeChangedException extends Error {
  constructor() {
    super(
      "Screenshoting failed: element scroll size changed during screenshot.",
    );
  }
}

export class ScrollableElementScrolledException extends Error {
  constructor(oldTopValue: number, newTopValue: number) {
    super(
      "Screenshoting failed: scrollTop changed from: " +
        oldTopValue +
        " to: " +
        newTopValue +
        " during screenshot. Did user scroll?",
    );
  }
}

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

async function captureElementScreenshotFragments(
  scrollableElement: Scrollable,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
  requestedScreenshotArea?: Box,
  customWaitOptions?: ScreenshotWaitOptions,
): Promise<ScrollableScreenshot> {
  const onStartClientBox = scrollableElement.getClientBoxInViewport();
  const onStartScrollSize = scrollableElement.getScrollSize();

  if (requestedScreenshotArea) {
    checkScreenshotAreaValid(requestedScreenshotArea, onStartScrollSize);
  }
  const screenshotArea = requestedScreenshotArea ?? {
    x: 0,
    y: 0,
    width: onStartScrollSize.width,
    height: onStartScrollSize.height,
  };

  const waitOptions: Required<ScreenshotWaitOptions> = {
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

  if (onStartScrollSize.width > onStartClientBox.width) {
    throw new Error(
      "scroll width > client width. Horizontal scrolling not currently handled by screenshoting.",
    );
  }

  logger.debug(
    "Screenshoting scrollable  with box:",
    onStartClientBox,
    " and scrollSize:",
    onStartScrollSize,
  );
  const expectedFragmentsCount = Math.ceil(
    screenshotArea.height / onStartClientBox.height,
  );
  const progressPerFragment = 100 / expectedFragmentsCount;

  logger.debug(
    "Expecting " +
      expectedFragmentsCount +
      " page screenshots to be necessary.",
  );

  const screenshots: ScreenshotFragment[] = [];

  let nextTop = screenshotArea.y;
  const screenshotBottom = screenshotArea.y + screenshotArea.height;
  const maxScrollTopAcceptableValue = Math.max(
    0,
    onStartScrollSize.height - onStartClientBox.height,
  );
  while (nextTop < screenshotBottom) {
    scrapingSupport.throwIfAborted();

    // Ensure requestedTop screenshot does not extend past scrollclientSize
    const requestedTop = Math.min(nextTop, maxScrollTopAcceptableValue);

    logger.debug(
      "Scroll to requestedTop:" +
        requestedTop +
        " [nextTop was: " +
        nextTop +
        "]",
    );
    await scrollableElement.scrollTo({
      top: requestedTop,
      waitForScrollEnd: waitOptions.waitForScrollEnd,
    });

    if (waitOptions.waitForIdle) {
      // Wait for "idle"
      await waitIdleOrTimeout(5000);
    }

    if (waitOptions.extraWait > 0) {
      // wait extra delay if specified
      await sleep(waitOptions.extraWait);
    }

    logger.debug(
      "Capture Fragment - requestedTop:",
      requestedTop,
      "height:",
      onStartClientBox.height,
      "width:",
      onStartClientBox.width,
    );

    const dataUrl: string = await captureTabScreenshotAsDataUrl();
    assertUserDidntScrollDuringScreenshot(
      scrollableElement.getScrollPosition().top,
      requestedTop,
    );
    assertClientSizeDidntChange(
      scrollableElement.getClientBoxInViewport(),
      onStartClientBox,
    );

    // Loading content outside a fixed capture area does not invalidate it.
    // Full captures still require the complete scrollable size to stay stable.
    if (!requestedScreenshotArea) {
      assertScrollableSizeDidntChange(
        scrollableElement.getScrollSize(),
        onStartScrollSize,
      );
    }

    const tabImage: Image = decodePng(
      base64ToUint8Array(extractBase64DataFromDataUrl(dataUrl)),
    );
    const tabInnerSize: Size = {
      height: window.innerHeight,
      width: window.innerWidth,
    };
    await maybeStoreDebugScreenshot(tabImage, {
      type: "tab-image",
      desc: "scrollTop:" + requestedTop,
    });

    const scrollableScreenshot = cropViewportImageToScrollable(
      tabImage,
      tabInnerSize,
      onStartClientBox,
    );
    await maybeStoreDebugScreenshot(scrollableScreenshot, {
      type: "scrollable-fragment",
      desc: "scrollTop:" + requestedTop,
    });

    const visibleArea: Box = {
      x: 0,
      y: requestedTop,
      width: onStartClientBox.width,
      height: onStartClientBox.height,
    };
    const remainingArea: Box = {
      ...screenshotArea,
      y: nextTop,
      height: screenshotBottom - nextTop,
    };
    const capturedArea = intersectRects(visibleArea, remainingArea);
    if (!capturedArea) {
      throw new Error(
        "The visible area does not intersect the screenshot area.",
      );
    }
    const fragmentImage = cropImageToCssArea(
      scrollableScreenshot,
      visibleArea,
      capturedArea,
    );
    await maybeStoreDebugScreenshot(tabImage, {
      type: "scrollable-fragment-requested-area",
      desc: "scrollTop:" + requestedTop,
    });

    const screenshot: ScreenshotFragment = {
      catpureArea: capturedArea,
      screenshotPng: encodePng(fragmentImage),
    };
    screenshots.push(screenshot);
    progressManager.setProgress(screenshots.length * progressPerFragment);
    nextTop = capturedArea.y + capturedArea.height;
  }
  return {
    clientSize: onStartClientBox,
    fragments: screenshots,
  };
}

function cropViewportImageToScrollable(
  tabImage: Image,
  tabInnerSize: Size,
  scrollableBox: Box,
): Image {
  ensureScrollableFullyVisibleInViewport(scrollableBox, tabInnerSize);
  if (
    tabImage.width === scrollableBox.width &&
    tabImage.height == scrollableBox.height &&
    scrollableBox.x === 0 &&
    scrollableBox.y === 0
  ) {
    // scrollable exactly matches tabInnerContent
    // No need to crop
    return tabImage;
  }
  const imgScaleX = tabImage.width / tabInnerSize.width;
  const imgScaleY = tabImage.height / tabInnerSize.height;

  const cropOptions: CropOptions = {
    origin: {
      column: Math.floor(scrollableBox.x * imgScaleX),
      row: Math.floor(scrollableBox.y * imgScaleY),
    },
    width: Math.floor(scrollableBox.width * imgScaleX),
    height: Math.floor(scrollableBox.height * imgScaleY),
  };
  logger.debug(
    "croping tabImage - scrollableBox:",
    scrollableBox,
    " tabImageSize:",
    {
      width: tabImage.width,
      height: tabImage.height,
    },
    " scale:",
    { imgScaleX, imgScaleY },
    " cropOptions:",
    cropOptions,
  );
  return tabImage.crop(cropOptions);
}

function ensureScrollableFullyVisibleInViewport(
  scrollableBox: Box,
  windowSize: Size,
) {
  if (
    scrollableBox.y < 0 ||
    scrollableBox.x < 0 ||
    scrollableBox.width > windowSize.width ||
    scrollableBox.height > windowSize.height
  ) {
    throw new Error("ScrollableElement extends beyond viewport display.");
  }
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

function intersectRects(first: Box, second: Box): Box | undefined {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  if (right <= left || bottom <= top) return undefined;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function cropImageToCssArea(
  image: Image,
  imageArea: Box,
  requestedArea: Box,
): Image {
  const scaleX = image.width / imageArea.width;
  const scaleY = image.height / imageArea.height;
  return image.crop({
    origin: {
      column: Math.round((requestedArea.x - imageArea.x) * scaleX),
      row: Math.round((requestedArea.y - imageArea.y) * scaleY),
    },
    width: Math.round(requestedArea.width * scaleX),
    height: Math.round(requestedArea.height * scaleY),
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

function assertUserDidntScrollDuringScreenshot(
  currentScroll: number,
  expectedTop: number,
) {
  if (Math.round(currentScroll) != Math.round(expectedTop)) {
    throw new ScrollableElementScrolledException(expectedTop, currentScroll);
  }
}

function assertClientSizeDidntChange(
  currentClientSize: Size,
  onStartClientSize: Size,
) {
  if (
    currentClientSize.height != onStartClientSize.height ||
    currentClientSize.width != onStartClientSize.width
  ) {
    throw new ScrollableElementClientSizeChangedException();
  }
}

function assertScrollableSizeDidntChange(
  currentScrollableSize: Size,
  onStartScrollableSize: Size,
) {
  if (
    currentScrollableSize.height != onStartScrollableSize.height ||
    currentScrollableSize.width != onStartScrollableSize.width
  ) {
    throw new ScrollableElementScrollSizeChangedException();
  }
}
