import { Image } from "image-js";
import type { ElementScreenshotProvider } from "./ElementScreenshotProvider";

/** Provides a transparent one-pixel image without capturing the page. */
export class EmptyElementScreenshotProvider implements ElementScreenshotProvider {
  buildElementScreenshot(_element: HTMLElement): Promise<Image> {
    return Promise.resolve(
      new Image(1, 1, {
        colorModel: "RGBA",
        data: new Uint8Array([0, 0, 0, 0]),
      }),
    );
  }
}
