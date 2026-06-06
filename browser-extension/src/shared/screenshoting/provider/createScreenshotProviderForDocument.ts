import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { DocumentScrollable, captureScrollableScreenshot } from "../scrollable";
import { ScrapingSupport } from "../../scraping/ScrapingSupport";
import { type ElementScreenshotProvider } from "./ElementScreenshotProvider";
import { DocumentDescendantsScreenshotProvider } from "./DocumentDescendantsScreenshotProvider";

/**
 * 1/ Captures screenshot of scrollable Document.
 * 2/ creates ScrollableDocumentScreenshotProvider from screenshot
 * @param scrollable
 * @param scrapingSupport
 * @param progressManager
 * @returns
 */
export async function createScreenshotProviderForDocument(
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<ElementScreenshotProvider> {
  const screenshot = await captureScrollableScreenshot(
    new DocumentScrollable(),
    scrapingSupport,
    progressManager,
  );
  return new DocumentDescendantsScreenshotProvider(screenshot);
}
