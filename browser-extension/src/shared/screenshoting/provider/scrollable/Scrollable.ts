import type { Size } from "../../box/Size";
import type { Box } from "../../box/Box";

/**
 * Abstraction around scrollable element.
 *
 */
export interface Scrollable {
  /**
   * Ensure scrollable visible in viewport or fail if it doesn't fit in viewport
   */
  scrollIntoViewIfNeededAndEnsureVisible(): Promise<void>;

  /**
   * The Box in viewport coordinate.
   * Generally equivalent to getBoudingClientRect()
   */
  getClientBoxInViewport(): Box;

  /**
   * Full size of element content
   */
  getScrollSize(): Size;

  /**
   * The curent scrolling position
   */
  getScrollPosition(): ScrollPosition;

  scrollTo(
    scrollToOptions: ScrollableScrollToOptions,
    waitScrollEnd?: boolean,
  ): Promise<void>;
}

export type ScrollableScrollToOptions = ScrollToOptions & {
  // Defaults to true
  waitForScrollEnd?: boolean;
};

export type ScrollPosition = {
  top: number;
  left: number;
};
