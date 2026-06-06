import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  captureScrollableScreenshot,
  ScrollableScreenshot,
} from "./captureScrollableScreenshot";
import { DocumentScrollable } from "./DocumentScrollable";

/**
 * CAptures full page screenshot scrolling the HTML element if needed.
 * @param scrapingSupport
 * @param progressManager
 * @returns
 */
export async function captureDocumentScreenshot(
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<ScrollableScreenshot> {
  return await captureScrollableScreenshot(
    new DocumentScrollable(),
    scrapingSupport,
    progressManager,
  );
}
