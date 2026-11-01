import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { withRetry } from "@/shared/utils/withRetry";
import type { Image } from "image-js";
import type { Box } from "../box/Box";
import { computeContainingBox } from "../box/computeContainingBox";
import { buildImageFromFragments } from "./buildImageFromFragments";
import { maybeStoreDebugScreenshot } from "./debug/debugScreenshots";
import { UnstableElementBox } from "./DocumentDescendantsScreenshotProvider";
import type { ElementScreenshotProvider } from "./ElementScreenshotProvider";
import {
  type ScrollableScreenshot,
  captureScrollableScreenshot,
  type Scrollable,
} from "./scrollable";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import {
  ScrollableElementClientSizeChangedException,
  ScrollableElementScrolledException,
} from "./scrollable/captureScrollableScreenshot";

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
      retryOn: (e) =>
        e instanceof UnstableElementBox ||
        e instanceof ScrollableElementClientSizeChangedException ||
        e instanceof ScrollableElementScrolledException,
      beforeRetry: async ({ latestError, remainingAttempts }) => {
        const error = latestError as
          | UnstableElementBox
          | ScrollableElementClientSizeChangedException
          | ScrollableElementScrolledException;
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

        const boxesAfterCapture = new Map(
          elements.map((e) => [e, this.computeElementBoxInContainer(e)]),
        );

        // Check boxes are same after capture
        // As a way to ensure screenshots took a "stable picture"
        this.checkElementsBoxesStable(boxesBeforeCapture, boxesAfterCapture);

        // Build screenshots from fragments
        const elementScreenshots: Image[] = [];
        for (const element of elements) {
          const box = boxesAfterCapture.get(element)!;
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

  private checkElementsBoxesStable(
    before: Map<HTMLElement, Box>,
    after: Map<HTMLElement, Box>,
  ) {
    for (const [element, beforeLocation] of before.entries()) {
      const afterLocation = after.get(element);
      if (afterLocation === undefined) {
        throw new Error("After location unexpectidly missing");
      }
      if (
        beforeLocation.x !== afterLocation.x ||
        beforeLocation.y !== afterLocation.y ||
        beforeLocation.height !== afterLocation.height ||
        beforeLocation.width !== afterLocation.width
      ) {
        throw new UnstableElementBox(element, beforeLocation, afterLocation);
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
