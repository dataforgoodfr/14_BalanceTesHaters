import type { Image } from "image-js";

/**
 * Interface abstracting away the capture of Element screenshots
 */
export interface ElementScreenshotProvider {
  /**
   *
   * @param element
   * @throws ObsoleteScreenshotError
   */
  buildElementScreenshot(element: HTMLElement): Promise<Image>;
}

/** Thrown when screenshot is obsoleted due for instance to client resize*/
export class ObsoleteScreenshotError extends Error {}
