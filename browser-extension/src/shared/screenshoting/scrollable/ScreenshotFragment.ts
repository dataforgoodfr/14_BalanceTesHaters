import { Image } from "image-js";

export interface ScreenshotFragment {
  /**
   * Captured area in CSS pixels
   */
  catpureArea: Rect;
  /**
   * Corresponding image
   * WARNING: this can be high res (more than 1 pixel per CSS pixel)
   */
  screenshotImage: Image;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
