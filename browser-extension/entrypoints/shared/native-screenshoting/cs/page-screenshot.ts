import { Image } from "image-js";
import { captureTabScreenshotAsDataUrl } from "./screenshot-cs-tab";
import { ScreenshotFragment } from "./screenshot-fragment";
import { sleep } from "../../utils/sleep";
import { selectOrThrow } from "../../dom-scraping/dom-scraping";
import { buildFullImageFromFragments } from "./full-image";

export async function captureFullPageScreenshot(): Promise<Image> {
  const pageScreenshots = await capturePageScreenshotFragmentss();

  return buildFullImageFromFragments(pageScreenshots);
}

async function capturePageScreenshotFragmentss(): Promise<
  ScreenshotFragment[]
> {
  const scrollable = selectOrThrow(document, "html", HTMLHtmlElement);
  if (scrollable.scrollWidth > window.innerWidth) {
    console.warn(
      "Page seems wider than viewport. This does not handle horizontal scrolling."
    );
  }

  const initialScrollHeight = scrollable.scrollHeight;
  const screenshots: ScreenshotFragment[] = [];
  for (;;) {
    const top = screenshots
      .map((s) => s.catpureArea.height)
      .reduce((sum, v) => sum + v, 0);
    scrollable.scrollTop = top;
    const height = window.innerHeight;
    console.debug("capturePageScreenshots - top", top, "height", height);
    await sleep(200);
    if (top >= initialScrollHeight) {
      if (scrollable.scrollHeight != initialScrollHeight) {
        console.warn(
          "scrollHeight changed since capture start. Only page down initial height will be captured."
        );
      }
      return screenshots;
    }

    const dataUrl: string = await captureTabScreenshotAsDataUrl();

    const area = {
      x: 0,
      y: top,
      width: window.innerWidth,
      height: height,
    };
    screenshots.push({
      catpureArea: area,
      screenshotDataUrl: dataUrl,
    });
  }
}
