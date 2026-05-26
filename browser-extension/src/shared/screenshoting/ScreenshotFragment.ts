import { Image } from "image-js";

export interface ScreenshotFragment {
  catpureArea: Rect;
  screenshotImage: Image;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
