import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import {
  HTMLElementScrollable,
  captureScrollableScreenshot,
} from "../scrollable/";
import { ScrapingSupport } from "../../scraping/ScrapingSupport";
import { type ElementScreenshotProvider } from "./ElementScreenshotProvider";
import { ElementDescendantsScreenshotProvider } from "./ElementDescendantsScreenshotProvider";

/**
 * 1/ Captures screenshot of scrollable HTMLElement.
 * 2/ creates DescendantElementScreenshotProvider from screenshot
 * @param scrollable
 * @param scrapingSupport
 * @param progressManager
 * @returns
 */
export async function createScreenshotProviderForScrollableDescendants(
  scrollable: HTMLElement,
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<ElementScreenshotProvider> {
  const screenshot = await captureScrollableScreenshot(
    new HTMLElementScrollable(scrollable),
    scrapingSupport,
    progressManager,
  );
  return new ElementDescendantsScreenshotProvider(scrollable, screenshot);
}
