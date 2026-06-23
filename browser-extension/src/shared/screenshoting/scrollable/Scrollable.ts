import { Image } from "image-js";
import { Size } from "../Size";

/**
 * Abstraction around scrollable element. mostly to accomodate some quirks on client size returned on youtube
 *
 */
export interface Scrollable {
  /**
   * The client size (displayed size in viewport)
   */
  getClientSize(): Size;

  /**
   * Full size of element
   */
  getScrollSize(): Size;

  getScrollPosition(): Position;

  scrollTo(
    scrollToOptions: ScrollableScrollToOptions,
    waitScrollEnd?: boolean,
  ): Promise<void>;

  /**
   * TODO split move to a separate interface
   */
  cropToElement(tabImage: Image, tabInnerSize: Size): Image;
}

export type ScrollableScrollToOptions = ScrollToOptions & {
  // Defaults to true
  waitForScrollEnd?: boolean;
};

export type Position = {
  top: number;
  left: number;
};
