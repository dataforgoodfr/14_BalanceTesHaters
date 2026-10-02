// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { captureScrollableScreenshot } from "../../scrollable";
import type * as ScrollableModule from "../../scrollable";
import { createScreenshotProviderForDocumentArea } from "../createScreenshotProviderForDocumentArea";

vi.mock("../../scrollable", async (importOriginal) => ({
  ...(await importOriginal<typeof ScrollableModule>()),
  captureScrollableScreenshot: vi.fn(() =>
    Promise.resolve({
      clientSize: { width: 1000, height: 800 },
      fragments: [],
    }),
  ),
}));

describe("createScreenshotProviderForDocumentArea", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollX", { value: 10, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 20, configurable: true });
  });

  test("passes the union of the element bounds as the screenshot area", async () => {
    const first = document.createElement("div");
    first.getBoundingClientRect = vi.fn(
      () =>
        ({ left: 100.5, top: 200.5, right: 400.5, bottom: 300.5 }) as DOMRect,
    );
    const second = document.createElement("div");
    second.getBoundingClientRect = vi.fn(
      () =>
        ({ left: 90.5, top: 290.5, right: 450.5, bottom: 500.5 }) as DOMRect,
    );
    const support = new ScrapingSupport(new AbortController().signal);
    const progress = new ProgressManager(vi.fn());

    await createScreenshotProviderForDocumentArea(
      [first, second],
      support,
      progress,
    );

    expect(captureScrollableScreenshot).toHaveBeenCalledWith(
      expect.anything(),
      support,
      progress,
      { x: 100, y: 220, width: 361, height: 301 },
    );
  });
});
