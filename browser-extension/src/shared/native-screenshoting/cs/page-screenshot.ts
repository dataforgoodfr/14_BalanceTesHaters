import { encodePng, Image } from "image-js";
import { captureTabScreenshotAsDataUrl } from "./screenshot-cs-tab";
import { ScreenshotFragment } from "./screenshot-fragment";
import { ScrapingSupport } from "../../scraping/ScrapingSupport";
import { buildFullImageFromFragments } from "./full-image";
import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { withRetry } from "@/shared/utils/withRetry";

const STORE_SCREENSHOT_FOR_DEBUG = false;

const logPrefix = "[Screenshoting]";
export async function captureFullPageScreenshot(
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<FullPageScreenshotResult> {
  console.debug(logPrefix, "Capturing fragments...");

  return await withRetry<FullPageScreenshotResult>({
    maxAttempts: 10,
    retryOn: (e) =>
      e instanceof WindowResizedException ||
      e instanceof WindowScrolledException,
    beforeRetry: async ({ latestError, remainingAttempts }) => {
      const error = latestError as
        | WindowResizedException
        | WindowScrolledException;
      console.warn(
        logPrefix,
        "Error: ",
        error.message,
        ". Retrying in 2s: " + remainingAttempts + " attempts remaining.",
      );
      await scrapingSupport.sleep(2000);
    },
    retry: async () => {
      const { fragments: pageScreenshots, viewPortSize } =
        await capturePageScreenshotFragments(
          scrapingSupport,
          // Consider that capturing screenshots amount for 90% of screenshoting work
          progressManager.subTaskProgressManager({ from: 0, to: 90 }),
        );
      console.debug(logPrefix, "Building full image from fragments...");
      scrapingSupport.throwIfAborted();
      const fullPageScreenshot = buildFullImageFromFragments(pageScreenshots);
      if (STORE_SCREENSHOT_FOR_DEBUG) {
        await storeForDebug(fullPageScreenshot);
      }
      progressManager.setProgress(100);
      return { image: fullPageScreenshot, viewPortSize };
    },
  });
}

export type FullPageScreenshotResult = {
  image: Image;
  /**
   * View port size at screenshot time.
   * This allows caller to known if viewPort has been resied since capture
   */
  viewPortSize: ViewPortSize;
};

export type ViewPortSize = {
  width: number;
  height: number;
};

class WindowResizedException extends Error {
  constructor() {
    super("Screenshoting failed: window size changed during screenshot.");
  }
}

class WindowScrolledException extends Error {
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

async function capturePageScreenshotFragments(
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<{ fragments: ScreenshotFragment[]; viewPortSize: ViewPortSize }> {
  const onStartViewPortSize = {
    height: window.innerHeight,
    width: window.innerWidth,
  };
  const scrollable = scrapingSupport.selectOrThrow(
    document,
    "html",
    HTMLHtmlElement,
  );
  if (scrollable.scrollWidth > window.innerWidth) {
    console.warn(
      logPrefix,
      "Page seems wider than viewport. This does not handle horizontal scrolling.",
    );
  }

  const screenshots: ScreenshotFragment[] = [];
  const expectedFragmentsCount = Math.ceil(
    scrollable.scrollHeight / window.innerHeight,
  );
  const progressPerFragment = 100 / expectedFragmentsCount;
  for (;;) {
    scrapingSupport.throwIfAborted();
    const requestedTop = screenshots
      .map((s) => s.catpureArea.height)
      .reduce((sum, v) => sum + v, 0);

    if (requestedTop >= scrollable.scrollHeight) {
      return { fragments: screenshots, viewPortSize: onStartViewPortSize };
    }

    scrollable.scrollTop = requestedTop;
    // If we are at the end of page actualTop differs because we cannot scrol past the bottom of page
    const actualTop = scrollable.scrollTop;
    console.debug(
      logPrefix,
      "Capture Fragment - requestedTop",
      requestedTop,
      "actualTop",
      actualTop,
      "height",
      window.innerHeight,
      "width",
      window.innerHeight,
    );

    // This sleep seems required for screenshot to capture the right content.
    // This may be due to some js moving pieces on scroll on the youtube page?
    await scrapingSupport.sleep(200);

    const dataUrl: string = await captureTabScreenshotAsDataUrl();
    if (scrollable.scrollTop != actualTop) {
      throw new WindowScrolledException(actualTop, scrollable.scrollTop);
    }

    if (
      window.innerHeight != onStartViewPortSize.height ||
      window.innerWidth != onStartViewPortSize.width
    ) {
      throw new WindowResizedException();
    }

    const area = {
      x: 0,
      y: actualTop,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    screenshots.push({
      catpureArea: area,
      screenshotDataUrl: dataUrl,
    });
    progressManager.setProgress(screenshots.length * progressPerFragment);
  }
}

export const STORAGE_KEY_DEBUG_FP_SCREENSHOT_DATAURL =
  "debugFullPageScreenshotDataUrl";
async function storeForDebug(fullPageScreenshot: Image) {
  console.debug(
    logPrefix,
    "Storing full page screenshot for debugging purpose...",
  );
  const dataUrl = buildDataUrl(
    uint8ArrayToBase64(encodePng(fullPageScreenshot)),
    PNG_MIME_TYPE,
  );
  await browser.storage.local.set({
    [STORAGE_KEY_DEBUG_FP_SCREENSHOT_DATAURL]: dataUrl,
  });
}
