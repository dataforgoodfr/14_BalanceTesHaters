import type { Image, CropOptions } from "image-js";
import { type Size } from "../../box/Size";
import type { Scrollable, ScrollPosition } from "./Scrollable";
import { scrollToAndWait } from "./scrollToAndWait";
import type { Box } from "../../box/Box";
import { sleep } from "@/shared/utils/sleep";

export class HTMLElementScrollable implements Scrollable {
  constructor(readonly scrollableElement: HTMLElement) {}

  async scrollIntoViewIfNeededAndEnsureVisible(): Promise<void> {
    this.ensureElementFitsInViewport();
    if (this.isFullyVisibleInViewPort()) {
      // Already visible in viewport
      return;
    }

    // scroll in view port
    this.scrollableElement.scrollIntoView({
      behavior: "instant",
      block: "center",
    });
    /// Wait until visible
    const start = Date.now();
    const timeout = 2000;
    for (;;) {
      if (this.isFullyVisibleInViewPort()) {
        return;
      }
      const elapsed = Date.now() - start;
      if (elapsed > timeout) {
        throw new Error(
          "ScrollableElement extends beyond viewport display after scrollIntoView." +
            `viewPortSize: ${JSON.stringify({ width: window.innerWidth, height: window.innerHeight })}, 
            scrollableBoundingClientRect: ${JSON.stringify(this.scrollableElement.getBoundingClientRect())}`,
        );
      }
      await sleep(500);
    }
  }

  getClientBoxInViewport(): Box {
    const scrollableElementRect =
      this.scrollableElement.getBoundingClientRect();

    const topBorderWidth = this.scrollableElement.clientTop;
    const leftBorderWidth = this.scrollableElement.clientLeft;

    const elementInnerLeft = scrollableElementRect.x + leftBorderWidth;
    const elementInnerTop = scrollableElementRect.y + topBorderWidth;
    return {
      x: elementInnerLeft,
      y: elementInnerTop,
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

  async scrollTo(scrollOptions: ScrollToOptions): Promise<void> {
    await scrollToAndWait(
      this.scrollableElement,
      this.scrollableElement,
      this.getScrollPosition(),
      scrollOptions,
    );
  }

  getScrollPosition(): ScrollPosition {
    return {
      top: this.scrollableElement.scrollTop,
      left: this.scrollableElement.scrollLeft,
    };
  }

  cropToElement(tabImage: Image, tabInnerSize: Size): Image {
    const scrollableElementRect =
      this.scrollableElement.getBoundingClientRect();

    const topBorderWidth = this.scrollableElement.clientTop;
    const leftBorderWidth = this.scrollableElement.clientLeft;

    const scaleX = tabImage.width / tabInnerSize.width;

    const scaleY = tabImage.height / tabInnerSize.height;

    const elementInnerTop = scrollableElementRect.x + leftBorderWidth;
    const elementInnerLeft = scrollableElementRect.y + topBorderWidth;
    const cropOptions: CropOptions = {
      origin: {
        column: Math.round(elementInnerTop * scaleX),
        row: Math.round(elementInnerLeft * scaleY),
      },
      width: Math.round(this.scrollableElement.clientWidth * scaleX),
      height: Math.round(this.scrollableElement.clientHeight * scaleY),
    };
    return tabImage.crop(cropOptions);
  }

  private ensureElementFitsInViewport() {
    const scrollableElementRect =
      this.scrollableElement.getBoundingClientRect();
    if (
      scrollableElementRect.width > window.innerWidth ||
      scrollableElementRect.height > window.innerHeight
    ) {
      throw new Error(
        "ScrollableElement does not fit in viewport." +
          `viewPortSize: ${JSON.stringify({ width: window.innerWidth, height: window.innerHeight })}, 
            scrollableBoundingClientRect: ${JSON.stringify(this.scrollableElement.getBoundingClientRect())}`,
      );
    }
  }

  private isFullyVisibleInViewPort(): boolean {
    const scrollableElementRect =
      this.scrollableElement.getBoundingClientRect();
    return (
      scrollableElementRect.top >= 0 &&
      scrollableElementRect.left >= 0 &&
      scrollableElementRect.right <= window.innerWidth &&
      scrollableElementRect.bottom <= window.innerHeight
    );
  }
}
