// @vitest-environment happy-dom

import { decodePng, encodePng, Image } from "image-js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import type { Size } from "../../../box/Size";
import type {
  ScrollPosition,
  Scrollable,
  ScrollableScrollToOptions,
} from "../Scrollable";
import { captureScrollableScreenshot } from "../captureScrollableScreenshot";
import type { Box } from "@/shared/screenshoting/box/Box";
import { captureTabScreenshotAsDataUrl } from "../../../tab/captureTabScreenshotAsDataUrl";

vi.mock("../../../tab/captureTabScreenshotAsDataUrl", () => ({
  captureTabScreenshotAsDataUrl: vi.fn(),
}));

vi.mock("../../debug/debugScreenshots", () => ({
  maybeStoreDebugScreenshot: vi.fn(),
}));

class FakeScrollable implements Scrollable {
  private top = 0;
  clientBox: Box = { x: 0, y: 0, width: 4, height: 2 };
  scrollCalls = 0;

  constructor(
    private readonly settleTop: (requestedTop: number) => number = (
      requestedTop,
    ) => requestedTop,
  ) {}

  scrollIntoViewIfNeededAndEnsureVisible(): Promise<void> {
    return Promise.resolve();
  }

  getClientBoxInViewport(): Box {
    return { ...this.clientBox };
  }

  getScrollSize(): Size {
    return { width: 4, height: 10 };
  }

  getScrollPosition(): ScrollPosition {
    return { top: this.top, left: 0 };
  }

  simulateUserScroll(delta: number): void {
    this.top += delta;
  }

  scrollTo(options: ScrollableScrollToOptions): Promise<void> {
    this.scrollCalls++;
    this.top = this.settleTop(options.top ?? this.top);
    return Promise.resolve();
  }
}

class GrowingScrollable extends FakeScrollable {
  private height = 10;

  override getScrollSize(): Size {
    return { width: 4, height: this.height };
  }

  override async scrollTo(options: ScrollableScrollToOptions): Promise<void> {
    await super.scrollTo(options);
    this.height++;
  }
}

const screenshotDataUrl = `data:image/png;base64,${uint8ArrayToBase64(
  encodePng(new Image(4, 2)),
)}`;

describe("captureScrollableScreenshot", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      value: 4,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 2,
      configurable: true,
    });
    vi.mocked(captureTabScreenshotAsDataUrl).mockReset();
    vi.mocked(captureTabScreenshotAsDataUrl).mockResolvedValue(
      screenshotDataUrl,
    );
  });

  test("captures and stores only the requested CSS-pixel area", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 4,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 2,
      configurable: true,
    });

    const screenshot = await captureScrollableScreenshot(
      new FakeScrollable(),
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(vi.fn()),
      { x: 1, y: 3, width: 2, height: 4 },
      { waitForScrollEnd: false, extraWait: 0 },
    );

    expect(
      screenshot.fragments.map((fragment) => fragment.catpureArea),
    ).toEqual([
      { x: 1, y: 3, width: 2, height: 2 },
      { x: 1, y: 5, width: 2, height: 2 },
    ]);
    expect(
      screenshot.fragments.map((fragment) => {
        const image = decodePng(fragment.screenshotPng);
        return { width: image.width, height: image.height };
      }),
    ).toEqual([
      { width: 2, height: 2 },
      { width: 2, height: 2 },
    ]);
  });

  test("crops the tab screenshot to a scrollable that does not fill the viewport", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 8,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 6,
      configurable: true,
    });
    const tabImage = new Image(8, 6);
    for (let row = 0; row < tabImage.height; row++) {
      for (let column = 0; column < tabImage.width; column++) {
        tabImage.setPixel(column, row, [column, row, 100]);
      }
    }
    vi.mocked(captureTabScreenshotAsDataUrl).mockResolvedValue(
      `data:image/png;base64,${uint8ArrayToBase64(encodePng(tabImage))}`,
    );
    const scrollable = new FakeScrollable();
    scrollable.clientBox = { x: 2, y: 1, width: 4, height: 2 };

    const screenshot = await captureScrollableScreenshot(
      scrollable,
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(vi.fn()),
      { x: 1, y: 3, width: 2, height: 2 },
      { waitForScrollEnd: false, extraWait: 0 },
    );

    expect(screenshot.fragments).toHaveLength(1);
    const fragment = screenshot.fragments[0]!;
    expect(fragment.catpureArea).toEqual({
      x: 1,
      y: 3,
      width: 2,
      height: 2,
    });
    const fragmentImage = decodePng(fragment.screenshotPng);
    expect([
      fragmentImage.getPixel(0, 0),
      fragmentImage.getPixel(1, 0),
      fragmentImage.getPixel(0, 1),
      fragmentImage.getPixel(1, 1),
    ]).toEqual([
      [3, 1, 100],
      [4, 1, 100],
      [3, 2, 100],
      [4, 2, 100],
    ]);
  });

  test("discards overlap when the final requested position exceeds the maximum scrollTop", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 4,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 2,
      configurable: true,
    });

    const screenshot = await captureScrollableScreenshot(
      new FakeScrollable(),
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(vi.fn()),
      { x: 0, y: 7, width: 4, height: 3 },
      { waitForScrollEnd: false, extraWait: 0 },
    );

    expect(
      screenshot.fragments.map((fragment) => fragment.catpureArea),
    ).toEqual([
      { x: 0, y: 7, width: 4, height: 2 },
      { x: 0, y: 9, width: 4, height: 1 },
    ]);
  });

  test("allows the scrollable size to grow during an area capture", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 4,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 2,
      configurable: true,
    });

    const scrollable = new GrowingScrollable();
    const screenshot = await captureScrollableScreenshot(
      scrollable,
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(vi.fn()),
      { x: 0, y: 3, width: 4, height: 4 },
      { waitForScrollEnd: false, extraWait: 0 },
    );

    expect(
      screenshot.fragments.map((fragment) => fragment.catpureArea),
    ).toEqual([
      { x: 0, y: 3, width: 4, height: 2 },
      { x: 0, y: 5, width: 4, height: 2 },
    ]);
    expect(scrollable.getScrollSize().height).toBe(12);
  });

  test.each([-1, -0.75, 0.75, 1])(
    "accepts a %s CSS-pixel settling difference caused by physical-pixel snapping",
    async (settlingDifference) => {
      const scrollable = new FakeScrollable(
        (requestedTop) => requestedTop + settlingDifference,
      );

      const screenshot = await captureScrollableScreenshot(
        scrollable,
        new ScrapingSupport(new AbortController().signal),
        new ProgressManager(vi.fn()),
        { x: 0, y: 3, width: 4, height: 2 },
        { waitForScrollEnd: false, extraWait: 0 },
      );

      expect(screenshot.fragments).toHaveLength(1);
      expect(scrollable.scrollCalls).toBe(1);
      expect(captureTabScreenshotAsDataUrl).toHaveBeenCalledTimes(1);
    },
  );

  test("retries the current fragment when the settling difference exceeds one pixel", async () => {
    let attempts = 0;
    const scrollable = new FakeScrollable((requestedTop) => {
      attempts++;
      return requestedTop + (attempts === 1 ? 1.01 : 0.75);
    });
    const support = new ScrapingSupport(new AbortController().signal);
    const sleepSpy = vi.spyOn(support, "sleep").mockResolvedValue();

    const screenshot = await captureScrollableScreenshot(
      scrollable,
      support,
      new ProgressManager(vi.fn()),
      { x: 0, y: 3, width: 4, height: 2 },
      { waitForScrollEnd: false, extraWait: 0 },
    );

    expect(screenshot.fragments).toHaveLength(1);
    expect(scrollable.scrollCalls).toBe(2);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
    expect(captureTabScreenshotAsDataUrl).toHaveBeenCalledTimes(1);
  });

  test("retries only the current fragment when the user scrolls during capture", async () => {
    const scrollable = new FakeScrollable();
    const support = new ScrapingSupport(new AbortController().signal);
    const sleepSpy = vi.spyOn(support, "sleep").mockResolvedValue();
    vi.mocked(captureTabScreenshotAsDataUrl)
      // First fragment succeeds.
      .mockResolvedValueOnce(screenshotDataUrl)
      // User scrolls while the second fragment is being captured.
      .mockImplementationOnce(() => {
        scrollable.simulateUserScroll(2);
        return Promise.resolve(screenshotDataUrl);
      })
      // Retrying the second fragment succeeds.
      .mockResolvedValue(screenshotDataUrl);

    const screenshot = await captureScrollableScreenshot(
      scrollable,
      support,
      new ProgressManager(vi.fn()),
      { x: 0, y: 3, width: 4, height: 4 },
      { waitForScrollEnd: false, extraWait: 0 },
    );

    expect(screenshot.fragments).toHaveLength(2);
    expect(scrollable.scrollCalls).toBe(3);
    expect(captureTabScreenshotAsDataUrl).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
  });

  test("fails after ten attempts when the settling difference remains above one pixel", async () => {
    const scrollable = new FakeScrollable(
      (requestedTop) => requestedTop - 1.01,
    );
    const support = new ScrapingSupport(new AbortController().signal);
    const sleepSpy = vi.spyOn(support, "sleep").mockResolvedValue();

    await expect(
      captureScrollableScreenshot(
        scrollable,
        support,
        new ProgressManager(vi.fn()),
        { x: 0, y: 3, width: 4, height: 2 },
        { waitForScrollEnd: false, extraWait: 0 },
      ),
    ).rejects.toThrow("scrollTop changed during screenshot");
    expect(scrollable.scrollCalls).toBe(10);
    expect(sleepSpy).toHaveBeenCalledTimes(9);
    expect(captureTabScreenshotAsDataUrl).not.toHaveBeenCalled();
  });
});
