import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  captureScrollableScreenshot,
  Scrollable,
  ScrollableScreenshot,
  Size,
} from "./captureScrollableScreenshot";
import { Image } from "image-js";

/**
 * CAptures full page screenshot scrolling the HTML element if needed.
 * @param scrapingSupport
 * @param progressManager
 * @returns
 */
export async function captureHtmlPageScreenshot(
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<ScrollableScreenshot> {
  const scrollableElement = new HtmlPageScrollable();

  return await captureScrollableScreenshot(
    scrollableElement,
    scrapingSupport,
    progressManager,
  );
}

class HtmlPageScrollable implements Scrollable {
  constructor(
    private readonly scrollable: HTMLHtmlElement = document.querySelector(
      "html",
    ) as HTMLHtmlElement,
  ) {}

  getClientSize(): Size {
    // We use the window client size here because
    // in youtube html.getClientBoundingRect().height is 0...
    // Not sure why
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  getScrollSize(): Size {
    return {
      width: this.scrollable.scrollWidth,
      height: this.scrollable.scrollHeight,
    };
  }

  scrollTo(scrollOptions: ScrollToOptions): void {
    window.scrollTo(scrollOptions);
  }

  getScrollTop(): number {
    return this.scrollable.scrollTop;
  }

  cropToElement(tabImage: Image): Image {
    // Capturing full window
    // => No Croping
    return tabImage;
  }
}
