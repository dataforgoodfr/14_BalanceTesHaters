import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { Box } from "../box/Box";
import { DocumentScrollable, type Scrollable } from "./scrollable";
import { BaseScreenshotProvider } from "./BaseScreenshotProvider";

/**
 * Screenshot provider for elements inside a scrollable Document.
 */
export class DocumentDescendantsScreenshotProvider extends BaseScreenshotProvider {
  constructor(scrapingSupport: ScrapingSupport) {
    super(scrapingSupport);
  }
  override createScrollable(): Scrollable {
    return new DocumentScrollable();
  }

  override computeElementBoxInContainer(element: HTMLElement): Box {
    const { x, y, width, height } = element.getBoundingClientRect();
    return {
      x: window.scrollX + x,
      y: window.scrollY + y,
      width,
      height,
    };
  }
}
