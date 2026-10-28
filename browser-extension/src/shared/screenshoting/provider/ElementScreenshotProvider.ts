import type { Image } from "image-js";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";

/**
 * Interface abstracting away the capture of Element screenshots
 */
export interface ElementScreenshotProvider {
  /**
   *
   * @param elements
   */
  buildElementScreenshots(
    elements: HTMLElement[],
    progressManager: ProgressManager,
  ): Promise<Image[]>;
}
