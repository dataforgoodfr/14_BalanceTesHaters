import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  captureScrollableScreenshot,
  DocumentScrollable,
  type Rect,
} from "../scrollable";
import type { ElementScreenshotProvider } from "./ElementScreenshotProvider";
import { DocumentDescendantsScreenshotProvider } from "./DocumentDescendantsScreenshotProvider";

export async function createScreenshotProviderForDocumentArea(
  elements: HTMLElement[],
  scrapingSupport: ScrapingSupport,
  progressManager: ProgressManager,
): Promise<ElementScreenshotProvider> {
  if (elements.length === 0) {
    throw new Error("Cannot capture an empty document area.");
  }

  const containingRect: Rect = buildElementsContainingRect(elements, (e) => {
    const rect = e.getBoundingClientRect();
    return {
      x: window.scrollX + rect.left,
      y: window.scrollY + rect.top,
      width: rect.width,
      height: rect.height,
    };
  });

  const screenshot = await captureScrollableScreenshot(
    new DocumentScrollable(),
    scrapingSupport,
    progressManager,
    containingRect,
  );
  return new DocumentDescendantsScreenshotProvider(screenshot);
}

function buildElementsContainingRect(
  elements: HTMLElement[],
  elementRectProvider: (e: HTMLElement) => Rect,
): Rect {
  const elementRects: Rect[] = elements.map(elementRectProvider);
  const left = Math.floor(
    Math.min(...elementRects.map<number>((rect: Rect) => rect.x)),
  );
  const right = Math.ceil(
    Math.max(...elementRects.map((rect) => rect.x + rect.width)),
  );
  const top = Math.floor(Math.min(...elementRects.map((rect) => rect.y)));
  const bottom = Math.ceil(
    Math.max(...elementRects.map((rect) => rect.y + rect.height)),
  );
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
