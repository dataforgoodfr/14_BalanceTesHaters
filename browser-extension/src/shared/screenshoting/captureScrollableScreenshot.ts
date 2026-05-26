import { decodePng, Image } from "image-js";
import { captureTabScreenshotAsDataUrl } from "./captureTabScreenshotAsDataUrl";
import { ScreenshotFragment } from "./ScreenshotFragment";
import { ScrapingSupport } from "../scraping/ScrapingSupport";
import { base64ToUint8Array } from "@/shared/utils/base-64";
import { extractBase64DataFromDataUrl } from "@/shared/utils/data-url";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { withRetry } from "@/shared/utils/withRetry";
import { buildFullImageFromFragments } from "./buildFullImageFromFragments";
import { maybeStoreDebugScreenshot } from "./debugScreenshots";

export const logPrefix = "[Screenshoting]";

/** Abstraction around scrollable element. mostly to accomodate some quirks on client size returned on youtube*/
export interface Scrollable {
  /**
   * The client size (displayed size in viewport)
   */
  getClientSize(): Size;

  getScrollSize(): Size;

  scrollTo(scrollOptions: ScrollToOptions): void;

  getScrollTop(): number;

  cropToElement(tabImage: Image): Image;
}

export type ScrollableScreenshot = {
  image: Image;
  /**
   * Client Size of the element  at screenshot time (equals viewport if element is html element).
   * This allows caller to known if element has been resied since capture
   */
  clientSize: Size;
};

export async function captureScrollableScreenshot(
  scrollableElement: Scrollable,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<ScrollableScreenshot> {
  console.debug(logPrefix, "Capturing fragments...");
  return await withRetry<ScrollableScreenshot>({
    maxAttempts: 10,
    retryOn: (e) =>
      e instanceof ScrollableElementResizedException ||
      e instanceof ScrollableElementScrolledException,
    beforeRetry: async ({ latestError, remainingAttempts }) => {
      const error = latestError as
        | ScrollableElementResizedException
        | ScrollableElementScrolledException;
      console.warn(
        logPrefix,
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
        );
      console.debug(logPrefix, "Building full image from fragments...");
      scrapingSupport.throwIfAborted();
      const elementFullScreenshot = buildFullImageFromFragments(fragments);
      await maybeStoreDebugScreenshot(elementFullScreenshot, "scrollable-full");
      progressManager.setProgress(100);
      return { image: elementFullScreenshot, clientSize: viewPortSize };
    },
  });
}

export type Size = {
  width: number;
  height: number;
};

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
): Promise<{ fragments: ScreenshotFragment[]; clientSize: Size }> {
  const onStartClientSize = scrollableElement.getClientSize();
  const onStartScrollSize = scrollableElement.getScrollSize();

  if (onStartScrollSize.width > onStartClientSize.width) {
    throw new Error(
      "scroll width > client width. Horizontal scrolling not currently handled by screenshoting.",
    );
  }

  const screenshots: ScreenshotFragment[] = [];
  const expectedFragmentsCount = Math.ceil(
    onStartScrollSize.height / onStartClientSize.height,
  );
  const progressPerFragment = 100 / expectedFragmentsCount;
  for (;;) {
    scrapingSupport.throwIfAborted();
    const requestedTop = screenshots
      .map((s) => s.catpureArea.height)
      .reduce((sum, v) => sum + v, 0);

    if (requestedTop >= scrollableElement.getScrollSize().height) {
      // We reached end of element
      return { fragments: screenshots, clientSize: onStartClientSize };
    }

    scrollableElement.scrollTo({ top: requestedTop });
    // If we are at the end of page actualTop differs because we cannot scrol past the bottom of page
    // FIXME should we compute this instead of scrolling past and expected bounce?

    const actualTop = scrollableElement.getScrollTop();

    console.debug(
      logPrefix,
      "Capture Fragment - requestedTop",
      requestedTop,
      "actualTop",
      actualTop,
      "height",
      onStartClientSize.height,
      "width",
      onStartClientSize.width,
    );

    // This sleep seems required for screenshot to capture the right content.
    // This may be due to some js moving pieces on scroll on the youtube page?
    // FIXME test if still relevant
    await scrapingSupport.sleep(200);

    const dataUrl: string = await captureTabScreenshotAsDataUrl();

    assertUserDidntScroll(scrollableElement.getScrollTop(), actualTop);
    assertClientSizeDidntChange(
      scrollableElement.getClientSize(),
      onStartClientSize,
    );

    const tabImage: Image = decodePng(
      base64ToUint8Array(extractBase64DataFromDataUrl(dataUrl)),
    ).resize({
      // Resize to ensure one css pixel per image pixel
      height: Math.floor(window.innerHeight),
      width: Math.floor(window.innerWidth),
    });
    await maybeStoreDebugScreenshot(tabImage, "tab-image");

    const elementImage = scrollableElement.cropToElement(tabImage);
    await maybeStoreDebugScreenshot(elementImage, "scrollable-fragment");

    const capturedArea = {
      x: 0,
      y: actualTop,
      width: elementImage.width,
      height: elementImage.height,
    };
    screenshots.push({
      catpureArea: capturedArea,
      screenshotImage: elementImage,
    });
    progressManager.setProgress(screenshots.length * progressPerFragment);
  }
}

function assertUserDidntScroll(currentScroll: number, expectedTop: number) {
  if (currentScroll != expectedTop) {
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
