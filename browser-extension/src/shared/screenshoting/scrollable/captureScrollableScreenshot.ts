import { decodePng, Image } from "image-js";
import { captureTabScreenshotAsDataUrl } from "../tab/captureTabScreenshotAsDataUrl";
import { ScreenshotFragment } from "./ScreenshotFragment";
import { ScrapingSupport } from "../../scraping/ScrapingSupport";
import { base64ToUint8Array } from "@/shared/utils/base-64";
import { extractBase64DataFromDataUrl } from "@/shared/utils/data-url";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { withRetry } from "@/shared/utils/withRetry";
import { buildFullImageFromFragments } from "./buildFullImageFromFragments";
import { maybeStoreDebugScreenshot } from "../debug/debugScreenshots";
import { createLogger } from "../../utils/createLogger";
import { Scrollable } from "./Scrollable";
import { sleep } from "../../utils/sleep";
import { Size } from "../Size";

const logger = createLogger("[Screenshoting scrollable]");

export type ScrollableScreenshot = {
  /**
   * Scrollable Element screenshot image.
   * Image/Screenshot scale is normalized: 1 css pixel = 1 image pixel
   */
  image: Image;

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

export async function captureScrollableScreenshot(
  scrollableElement: Scrollable,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
  customWaitOptions?: ScreenshotWaitOptions,
): Promise<ScrollableScreenshot> {
  logger.debug(
    "Capturing fragments...",
    "customWaitOptions",
    customWaitOptions,
  );
  return await withRetry<ScrollableScreenshot>({
    maxAttempts: 10,
    retryOn: (e) =>
      e instanceof ScrollableElementResizedException ||
      e instanceof ScrollableElementScrolledException,
    beforeRetry: async ({ latestError, remainingAttempts }) => {
      const error = latestError as
        | ScrollableElementResizedException
        | ScrollableElementScrolledException;
      logger.warn(
        "Error: ",
        error.message,
        ". Retrying in 2s: " + remainingAttempts + " attempts remaining.",
      );
      await scrapingSupport.sleep(2000);
    },
    retry: async () => {
      const { fragments, clientSize: viewPortSize } =
        await captureElementScreenshotFragments(
          scrollableElement,
          scrapingSupport,
          // Consider that capturing screenshots amount for 90% of screenshoting work
          progressManager.subTaskProgressManager({ from: 0, to: 90 }),
          customWaitOptions,
        );
      logger.debug("Building full image from fragments...");
      scrapingSupport.throwIfAborted();
      const elementFullScreenshot = buildFullImageFromFragments(fragments);
      await maybeStoreDebugScreenshot(elementFullScreenshot, {
        type: "scrollable-full",
      });
      progressManager.setProgress(100);
      return { image: elementFullScreenshot, clientSize: viewPortSize };
    },
  });
}

export class ScrollableElementResizedException extends Error {
  constructor() {
    super(
      "Screenshoting failed: element client size changed during screenshot.",
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

async function captureElementScreenshotFragments(
  scrollableElement: Scrollable,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
  customWaitOptions?: ScreenshotWaitOptions,
): Promise<{ fragments: ScreenshotFragment[]; clientSize: Size }> {
  const onStartClientSize = scrollableElement.getClientSize();
  const onStartScrollSize = scrollableElement.getScrollSize();

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

  if (onStartScrollSize.width > onStartClientSize.width) {
    throw new Error(
      "scroll width > client width. Horizontal scrolling not currently handled by screenshoting.",
    );
  }

  const screenshots: ScreenshotFragment[] = [];
  const expectedFragmentsCount = Math.ceil(
    onStartScrollSize.height / onStartClientSize.height,
  );
  logger.debug(
    "Screenshoting will require " +
      expectedFragmentsCount +
      " page screenshots.",
  );

  const progressPerFragment = 100 / expectedFragmentsCount;

  let nextTop = 0;
  while (nextTop < scrollableElement.getScrollSize().height) {
    scrapingSupport.throwIfAborted();

    const requestedTop = Math.min(
      nextTop,
      onStartScrollSize.height - onStartClientSize.height,
    );

    logger.debug("Scroll to requestedTop:", requestedTop);
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
      onStartClientSize.height,
      "width:",
      onStartClientSize.width,
    );

    const dataUrl: string = await captureTabScreenshotAsDataUrl();
    assertUserDidntScrollDuringScreenshot(
      scrollableElement.getScrollPosition().top,
      requestedTop,
    );
    assertClientSizeDidntChange(
      scrollableElement.getClientSize(),
      onStartClientSize,
    );

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

    const elementImage = scrollableElement.cropToElement(
      tabImage,
      tabInnerSize,
    );
    await maybeStoreDebugScreenshot(elementImage, {
      type: "scrollable-fragment",
      desc: "scrollTop:" + requestedTop,
    });

    const screenshot = {
      catpureArea: {
        x: 0,
        y: requestedTop,
        width: onStartClientSize.width,
        height: onStartClientSize.height,
      },
      screenshotImage: elementImage,
    };
    screenshots.push(screenshot);
    progressManager.setProgress(screenshots.length * progressPerFragment);
    nextTop = nextTop + onStartClientSize.height;
  }
  return {
    clientSize: onStartClientSize,
    fragments: screenshots,
  };
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
    throw new ScrollableElementResizedException();
  }
}
