import { encodePng, Image } from "image-js";
import { captureTabScreenshotAsDataUrl } from "./screenshot-cs-tab";
import { ScreenshotFragment } from "./screenshot-fragment";
import { sleep } from "../../utils/sleep";
import { selectOrThrow } from "../../dom-scraping/dom-scraping";
import { buildFullImageFromFragments } from "./full-image";
import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";

const STORE_SCREENSHOT_FOR_DEBUG = false;

const logPrefix = "[Screenshoting]";
export async function captureFullPageScreenshot(): Promise<Image> {
  let remaining_attempts = 10;
  for (;;) {
    try {
      console.debug(logPrefix, "Capturing fragments...");
      const pageScreenshots = await capturePageScreenshotFragments();
      console.debug(logPrefix, "Building full image from fragments...");
      const fullPageScreenshot = buildFullImageFromFragments(pageScreenshots);

      if (STORE_SCREENSHOT_FOR_DEBUG) {
        await storeForDebug(fullPageScreenshot);
      }
      return fullPageScreenshot;
    } catch (e) {
      if (
        e instanceof WindowResizedException ||
        e instanceof WindowScrolledException
      ) {
        remaining_attempts--;
        if (remaining_attempts > 0) {
          console.warn(
            logPrefix,
            e.message +
              ". Retrying in 2s: " +
              remaining_attempts +
              " attempts remaining.",
          );
          await sleep(2000);
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }
  }
}

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

async function capturePageScreenshotFragments(): Promise<ScreenshotFragment[]> {
  const scrollable = selectOrThrow(document, "html", HTMLHtmlElement);
  if (scrollable.scrollWidth > window.innerWidth) {
    console.warn(
      logPrefix,
      "Page seems wider than viewport. This does not handle horizontal scrolling.",
    );
  }

  const screenshots: ScreenshotFragment[] = [];
  for (;;) {
    const requestedTop = screenshots
      .map((s) => s.catpureArea.height)
      .reduce((sum, v) => sum + v, 0);
    scrollable.scrollTop = requestedTop;

    // If we are at the end of page actualTop differs because we cannot scrol past the bottom of page
    const actualTop = scrollable.scrollTop;
    const height = window.innerHeight;
    const width = window.innerWidth;

    console.debug(
      logPrefix,
      "Capture Fragment - requestedTop",
      requestedTop,
      "actualTop",
      actualTop,
      "height",
      height,
      "width",
      width,
    );

    // This sleep seems required for screenshot to capture the right content.
    // This may be due to some js moving pieces on scroll on the youtube page?
    await sleep(200);
    if (requestedTop >= scrollable.scrollHeight) {
      return screenshots;
    }

    const dataUrl: string = await captureTabScreenshotAsDataUrl();
    if (scrollable.scrollTop != actualTop) {
      throw new WindowScrolledException(actualTop, scrollable.scrollTop);
    }
    if (window.innerHeight != height || window.innerWidth != width) {
      throw new WindowResizedException();
    }

    const area = {
      x: 0,
      y: actualTop,
      width: width,
      height: height,
    };
    screenshots.push({
      catpureArea: area,
      screenshotDataUrl: dataUrl,
    });
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
