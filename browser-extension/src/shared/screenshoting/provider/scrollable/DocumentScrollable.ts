import type { Image } from "image-js";
import type { Size } from "../../box/Size";
import type {
  Scrollable,
  ScrollableScrollToOptions,
  ScrollPosition,
} from "./Scrollable";
import { scrollToAndWait } from "./scrollToAndWait";
import type { Box } from "../../box/Box";

export class DocumentScrollable implements Scrollable {
  constructor() {}

  getClientBoxInViewport(): Box {
    // We use the window client size here because
    // in youtube html.getClientBoundingRect().height is 0...
    // Not sure why
    return {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  getScrollSize(): Size {
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    };
  }

  async scrollTo(scrollOptions: ScrollableScrollToOptions): Promise<void> {
    await scrollToAndWait(
      window,
      document,
      this.getScrollPosition(),
      scrollOptions,
    );
  }

  getScrollPosition(): ScrollPosition {
    return { top: window.scrollY, left: window.scrollX };
  }

  cropToElement(tabImage: Image, _tabInnerSize: Size): Image {
    // Capturing full window
    // => No Croping
    return tabImage;
  }
}
