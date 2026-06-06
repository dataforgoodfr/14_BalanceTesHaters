import { Image, CropOptions } from "image-js";
import { Size } from "../Size";
import { Scrollable, Position } from "./Scrollable";
import { scrollToAndWait } from "./scrollToAndWait";

export class HTMLElementScrollable implements Scrollable {
  constructor(readonly scrollableElement: HTMLElement) {}

  getClientSize(): Size {
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

  async scrollTo(scrollOptions: ScrollToOptions): Promise<void> {
    await scrollToAndWait(
      this.scrollableElement,
      this.scrollableElement,
      this.getScrollPosition(),
      scrollOptions,
    );
  }

  getScrollPosition(): Position {
    return {
      top: this.scrollableElement.scrollTop,
      left: this.scrollableElement.scrollLeft,
    };
  }

  cropToElement(tabImage: Image, tabInnerSize: Size): Image {
    this.ensureElementFullyVisibleInViewport();
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

  ensureElementFullyVisibleInViewport() {
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
