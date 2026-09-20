export interface ScreenshotFragment {
  /**
   * Captured area in CSS pixels
   */
  catpureArea: Rect;
  /** PNG bytes for the captured area. */
  screenshotPng: Uint8Array;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
