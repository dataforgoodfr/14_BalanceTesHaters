import { Image } from "image-js";
import { ElementScreenshotProvider } from "./ElementScreenshotProvider";
import { createLogger } from "@/shared/utils/createLogger";
import { ScrollableScreenshot } from "../scrollable";
import { maybeStoreDebugScreenshot } from "../debug/debugScreenshots";

const logger = createLogger("CroppingParentElementScreenshotProvider");
/**
 * Screenshot provider cropping screenshot of an ancestor element to build descendant screenshots.
 */
export class ElementDescendantsScreenshotProvider implements ElementScreenshotProvider {
  constructor(
    private readonly parentElement: HTMLElement,
    private readonly parentElementScreenshot: ScrollableScreenshot,
  ) {}

  async buildElementScreenshot(element: HTMLElement): Promise<Image> {
    this.ensureScreenshotStillRelevant();
    const { left, top } = this.computeElementOffsetComparedToAncestor(element);
    const height = element.clientHeight;
    const width = element.clientWidth;
    logger.debug("cropForElement - ", { top, left, height, width });

    const result = this.parentElementScreenshot.image.crop({
      origin: {
        column: Math.round(left),
        row: Math.round(top),
      },
      height: Math.round(height),
      width: Math.round(width),
    });

    // Artificially Keep async to facilitate storing cropped element for debug
    await maybeStoreDebugScreenshot(result, { type: "scrollable-cropped" });
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

      if (offsetParent === this.parentElement) {
        return { left, top };
      }
      currentElement = offsetParent;
    }
  }

  private ensureScreenshotStillRelevant() {
    if (
      this.parentElement.clientWidth !=
        this.parentElementScreenshot.clientSize.width ||
      this.parentElement.clientHeight !=
        this.parentElementScreenshot.clientSize.height
    ) {
      throw new Error(
        "Cannot extract sub element screenshot: Parent screenshot is obsolete because parent client size changed!!",
      );
    }
  }
}
