import { Image } from "image-js";
import type { ElementScreenshotProvider } from "./ElementScreenshotProvider";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";

/** Provides a transparent one-pixel image without capturing the page. */
export class EmptyElementScreenshotProvider implements ElementScreenshotProvider {
  buildElementScreenshots(
    elements: HTMLElement[],
    _progressManager: ProgressManager,
  ): Promise<Image[]> {
    return Promise.resolve(
      elements.map(
        () =>
          new Image(1, 1, {
            colorModel: "RGBA",
            data: new Uint8Array([0, 0, 0, 0]),
          }),
      ),
    );
  }
}
