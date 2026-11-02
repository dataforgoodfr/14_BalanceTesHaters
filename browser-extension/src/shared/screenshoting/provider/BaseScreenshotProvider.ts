import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { withRetry } from "@/shared/utils/withRetry";
import type { Image } from "image-js";
import type { Box } from "../box/Box";
import { computeContainingBox } from "../box/computeContainingBox";
import { buildImageFromFragments } from "./buildImageFromFragments";
import { maybeStoreDebugScreenshot } from "./debug/debugScreenshots";
import { UnstableElementBoxError } from "./UnstableElementBoxError";
import type { ElementScreenshotProvider } from "./ElementScreenshotProvider";
import {
  type ScrollableScreenshot,
  captureScrollableScreenshot,
  type Scrollable,
} from "./scrollable";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";

const logger = createLogger("screenshot-provider", scrapingLogger);
export abstract class BaseScreenshotProvider implements ElementScreenshotProvider {
  constructor(private readonly scrapingSupport: ScrapingSupport) {}

  async buildElementScreenshots(
    elements: HTMLElement[],
    progressManager: ProgressManager,
  ): Promise<Image[]> {
    if (elements.length === 0) return [];

    return withRetry({
      maxAttempts: 10,
      retryOn: (e) => e instanceof UnstableElementBoxError,
      beforeRetry: async ({ latestError, remainingAttempts }) => {
        const error = latestError as UnstableElementBoxError;
        logger.warn(
          "Error: ",
          error.message,
          ". Retrying in 2s, " + remainingAttempts + " attempts remaining.",
        );
        await this.scrapingSupport.sleep(2000);
      },
      retry: async () => {
        const boxesBeforeCapture = new Map(
          elements.map((e) => [e, this.computeElementBoxInContainer(e)]),
        );

        const captureArea: Box = computeContainingBox(
          boxesBeforeCapture.values().toArray(),
        );
        const scrollableScreenshot: ScrollableScreenshot =
          await captureScrollableScreenshot(
            this.createScrollable(),
            this.scrapingSupport,
            progressManager,
            captureArea,
          );
        const screenshotFragments = scrollableScreenshot.fragments;

        // Check boxes are same after capture
        // As a way to ensure screenshots took a "stable picture"
        this.checkElementsBoxesStable(boxesBeforeCapture);

        // Build screenshots from fragments
        const elementScreenshots: Image[] = [];
        for (const element of elements) {
          const box = boxesBeforeCapture.get(element)!;
          const elementScreenshot = buildImageFromFragments(
            screenshotFragments,
            box,
          );
          await maybeStoreDebugScreenshot(elementScreenshot, {
            type: "element",
            desc: "element with box: " + JSON.stringify(box),
          });
          elementScreenshots.push(elementScreenshot);
        }
        return elementScreenshots;
      },
    });
  }

  private checkElementsBoxesStable(before: Map<HTMLElement, Box>) {
    for (const [element, boxBefore] of before.entries()) {
      const boxAfterCapture = this.computeElementBoxInContainer(element);

      if (
        boxBefore.x !== boxAfterCapture.x ||
        boxBefore.y !== boxAfterCapture.y ||
        boxBefore.height !== boxAfterCapture.height ||
        boxBefore.width !== boxAfterCapture.width
      ) {
        logger.warn("Unstable Element box", element);
        throw new UnstableElementBoxError(element, boxBefore, boxAfterCapture);
      }
    }
  }

  abstract createScrollable(): Scrollable;
  /**
   * Builds elements offset relative to document and rect
   * @param element
   */
  abstract computeElementBoxInContainer(element: HTMLElement): Box;
}
