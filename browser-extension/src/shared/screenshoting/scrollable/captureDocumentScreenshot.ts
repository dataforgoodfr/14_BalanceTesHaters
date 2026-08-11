import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { ScrollableScreenshot } from "./captureScrollableScreenshot";
import { captureScrollableScreenshot } from "./captureScrollableScreenshot";
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
