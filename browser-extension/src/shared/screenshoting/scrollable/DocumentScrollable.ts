import { Image } from "image-js";
import { Size } from "../Size";
import { Scrollable, ScrollableScrollToOptions, Position } from "./Scrollable";
import { scrollToAndWait } from "./scrollToAndWait";

export class DocumentScrollable implements Scrollable {
  constructor() {}

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

  getScrollPosition(): Position {
    return { top: window.scrollY, left: window.scrollX };
  }

  cropToElement(tabImage: Image, _tabInnerSize: Size): Image {
    // Capturing full window
    // => No Croping
    return tabImage;
  }
}
