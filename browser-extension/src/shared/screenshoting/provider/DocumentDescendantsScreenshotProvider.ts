import { Image } from "image-js";
import { type ElementScreenshotProvider } from "./ElementScreenshotProvider";
import { createLogger } from "@/shared/utils/createLogger";
import { ScrollableScreenshot } from "../scrollable";
import { maybeStoreDebugScreenshot } from "../debug/debugScreenshots";

const logger = createLogger("CroppingParentElementScreenshotProvider");
/**
 * Screenshot provider cropping a scrollable Document full screenshot to build descendant elements screenshots.
 */
export class DocumentDescendantsScreenshotProvider implements ElementScreenshotProvider {
  constructor(private readonly documentScreenshot: ScrollableScreenshot) {}

  async buildElementScreenshot(element: HTMLElement): Promise<Image> {
    this.ensureScreenshotStillRelevant();
    const elementBox = element.getBoundingClientRect();
    const left = window.scrollX + elementBox.left;
    const top = window.scrollY + elementBox.top;
    const height = elementBox.height;
    const width = elementBox.width;
    logger.debug("cropForElement - ", { top, left, height, width });

    const result = this.documentScreenshot.image.crop({
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

  private ensureScreenshotStillRelevant() {
    if (
      window.innerWidth !== this.documentScreenshot.clientSize.width ||
      window.innerHeight !== this.documentScreenshot.clientSize.height
    ) {
      throw new Error(
        "Cannot extract sub element screenshot: Document screenshot is obsolete because window inner size changed!!",
      );
    }
  }
}
