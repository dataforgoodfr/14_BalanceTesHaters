import { Image } from "image-js";

/**
 * Interface abstracting away the capture of Element screenshots
 */
export interface ElementScreenshotProvider {
  buildElementScreenshot(element: HTMLElement): Promise<Image>;
}
