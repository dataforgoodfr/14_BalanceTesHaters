import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  captureScrollableScreenshot,
  Scrollable,
  ScrollableScreenshot,
  Size,
} from "./captureScrollableScreenshot";
import { CropOptions, Image } from "image-js";

export async function captureHtmlElementScreenshot(
  scrollableElement: HTMLElement,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<ScrollableScreenshot> {
  return await captureScrollableScreenshot(
    new HtmlScrollableElement(scrollableElement),
    scrapingSupport,
    progressManager,
  );
}

class HtmlScrollableElement implements Scrollable {
  constructor(private scrollableElement: HTMLElement) {}

  getClientSize(): Size {
    //return this.scrollableElement.getBoundingClientRect();
    return {
      width: this.scrollableElement.clientWidth,
      height: this.scrollableElement.clientHeight,
    };
  }

  getScrollSize(): Size {
    return {
      width: this.scrollableElement.scrollWidth,
      height: this.scrollableElement.scrollHeight,
    };
  }

  scrollTo(scrollOptions: ScrollToOptions): void {
    this.scrollableElement.scrollTo(scrollOptions);
  }

  getScrollTop(): number {
    return this.scrollableElement.scrollTop;
  }

  cropToElement(tabImage: Image): Image {
    this.ensureElementFullyVisibleInViewport();
    const scrollableElementRect =
      this.scrollableElement.getBoundingClientRect();
    const innerTop =
      this.scrollableElement.offsetTop + this.scrollableElement.clientTop;
    const innerLeft =
      this.scrollableElement.offsetLeft + this.scrollableElement.clientLeft;
    console.log(
      "croping - scrollableElementRect:",
      scrollableElementRect,
      " inner",
      { top: innerTop, left: innerLeft },
    );
    const cropOptions: CropOptions = {
      // TODO clarify why this offset of 2px in origin and -1 pixel in height is needed?
      // This looks like an instagram special case.
      origin: {
        column: Math.floor(scrollableElementRect.x + 2),
        row: Math.floor(scrollableElementRect.y + 2),
      },
      width: Math.floor(this.scrollableElement.clientWidth),
      height: Math.floor(this.scrollableElement.clientHeight - 1),
    };
    return tabImage.crop(cropOptions);
  }

  private ensureElementFullyVisibleInViewport() {
    const scrollableElementRect =
      this.scrollableElement.getBoundingClientRect();
    if (
      scrollableElementRect.top < 0 ||
      scrollableElementRect.left < 0 ||
      scrollableElementRect.right > window.innerWidth ||
      scrollableElementRect.bottom > window.innerHeight
    ) {
      throw new Error("ScrollableElement extends beyond viewport display.");
    }
  }
}
