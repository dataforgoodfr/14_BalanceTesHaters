import type { Box } from "../../box/Box";

export interface ScreenshotFragment {
  /**
   * Scrollable element content area that has been captured.
   * In CSS pixels relative to scrollable top left corner.
   */
  catpureArea: Box;
  /** PNG bytes for the captured area. */
  screenshotPng: Uint8Array;
}
