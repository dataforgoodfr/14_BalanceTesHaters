import { HTMLElementScrollable, type Scrollable } from "./scrollable";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { BaseScreenshotProvider } from "./BaseScreenshotProvider";
import type { Box } from "../box/Box";
import type { Position } from "../box/Position";

/**
 * Screenshot provider cropping screenshot of an ancestor element to build descendant screenshots.
 */
export class ElementDescendantsScreenshotProvider extends BaseScreenshotProvider {
  constructor(
    private readonly parentElement: HTMLElement,
    scrapingSupport: ScrapingSupport,
  ) {
    super(scrapingSupport);
  }

  override computeElementBoxInContainer(element: HTMLElement): Box {
    const positionInParent =
      this.computeElementOffsetComparedToAncestor(element);
    return {
      ...positionInParent,
      height: element.clientHeight,
      width: element.clientWidth,
    };
  }

  override createScrollable(): Scrollable {
    return new HTMLElementScrollable(this.parentElement);
  }

  private computeElementOffsetComparedToAncestor(
    element: HTMLElement,
  ): Position {
    let left = 0;
    let top = 0;

    let currentElement = element;
    for (;;) {
      top += currentElement.offsetTop + currentElement.clientTop;
      left += currentElement.offsetLeft + currentElement.clientLeft;

      const offsetParent = currentElement.offsetParent;
      if (offsetParent === null || !(offsetParent instanceof HTMLElement)) {
        throw new Error("Cannot relate element to screenshot.");
      }

      if (offsetParent === this.parentElement) {
        return { x: left, y: top };
      }
      currentElement = offsetParent;
    }
  }
}
