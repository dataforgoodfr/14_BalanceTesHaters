import { maybeStoreDebugScreenshot } from "@/shared/screenshoting";
import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import { Image, encodePng } from "image-js";
import { ElementScreenshotProvider } from "./ElementScreenshotProvider";

/**
 * Screenshot provider cropping a screenshot of an ancestor element to build subelement screenshots.
 */
export class CroppingParentElementScreenshotProvider implements ElementScreenshotProvider {
  constructor(
    private readonly screenshotedElement: HTMLElement,
    private readonly screenshot: Image,
  ) {}

  async captureElementScreenshotAsPngBase64(
    element: HTMLElement,
  ): Promise<string> {
    const image = await this.cropForElement(element);
    return uint8ArrayToBase64(encodePng(image));
  }

  private async cropForElement(element: HTMLElement): Promise<Image> {
    const { left, top } = this.computeElementOffsetComparedToAncestor(element);
    const result = this.screenshot.crop({
      origin: {
        column: left,
        row: top,
      },
      // FIXME -1 here is required to avoid RangeError for last comment of list
      // This is probably related to other hacks in Scrollable
      height: element.clientHeight - 1,
      width: element.clientWidth,
    });

    // Artificially Keep async to facilitate storing cropped element for debug
    await maybeStoreDebugScreenshot(result, "scrollable-cropped");
    return result;
  }

  private computeElementOffsetComparedToAncestor(element: HTMLElement): {
    left: number;
    top: number;
  } {
    let left = 0;
    let top = 0;

    let currentElement = element;
    for (;;) {
      top += currentElement.offsetTop + currentElement.clientTop;
      left += currentElement.offsetLeft + currentElement.clientLeft;

      const offsetParent = currentElement.offsetParent;
      if (offsetParent === null || !(offsetParent instanceof HTMLElement)) {
        throw new Error("Cannot relate element to screenshot.");
      }

      if (offsetParent === this.screenshotedElement) {
        return { left, top };
      }
      currentElement = offsetParent;
    }
  }
}
