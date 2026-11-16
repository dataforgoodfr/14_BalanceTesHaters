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
  private left = 0;
  scrollSize: Size = { width: 4, height: 10 };
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
    return { ...this.scrollSize };
  }

  getScrollPosition(): ScrollPosition {
    return { top: this.top, left: this.left };
  }

  simulateUserScroll(delta: number): void {
    this.top += delta;
  }

  scrollTo(options: ScrollableScrollToOptions): Promise<void> {
    this.scrollCalls++;
    this.top = this.settleTop(options.top ?? this.top);
    this.left = options.left ?? this.left;
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

  test("captures a visible area even when content overflows horizontally", async () => {
    const scrollable = new FakeScrollable();
    scrollable.scrollSize.width = 6;
    const screenshot = await captureScrollableScreenshot(
      scrollable,
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(vi.fn()),
      { x: 0, y: 3, width: 4, height: 2 },
      { waitForScrollEnd: false, extraWait: 0 },
    );
    expect(
      screenshot.fragments.map((fragment) => fragment.catpureArea),
    ).toEqual([{ x: 0, y: 3, width: 4, height: 2 }]);
    expect(captureTabScreenshotAsDataUrl).toHaveBeenCalledTimes(1);
  });

  test("captures overflow in horizontal tiles with the correct pixels and no overlap", async () => {
    const scrollable = new FakeScrollable();
    scrollable.scrollSize.width = 6;
    vi.mocked(captureTabScreenshotAsDataUrl).mockImplementation(() => {
      const { top, left } = scrollable.getScrollPosition();
      const image = new Image(4, 2);
      for (let row = 0; row < 2; row++) {
        for (let column = 0; column < 4; column++) {
          image.setPixel(column, row, [left + column, top + row, 100]);
        }
      }
      return Promise.resolve(
        `data:image/png;base64,${uint8ArrayToBase64(encodePng(image))}`,
      );
    });
    const screenshot = await captureScrollableScreenshot(
      scrollable,
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(vi.fn()),
      { x: 0, y: 7, width: 6, height: 3 },
      { waitForScrollEnd: false, extraWait: 0 },
    );
    expect(
      screenshot.fragments.map((fragment) => fragment.catpureArea),
    ).toEqual([
      { x: 0, y: 7, width: 4, height: 2 },
      { x: 4, y: 7, width: 2, height: 2 },
      { x: 0, y: 9, width: 4, height: 1 },
      { x: 4, y: 9, width: 2, height: 1 },
    ]);
    for (const fragment of screenshot.fragments) {
      const image = decodePng(fragment.screenshotPng);
      const area = fragment.catpureArea;
      expect(image.width).toBe(area.width);
      expect(image.height).toBe(area.height);
      for (let row = 0; row < image.height; row++) {
        for (let column = 0; column < image.width; column++) {
          expect(image.getPixel(column, row)).toEqual([
            area.x + column,
            area.y + row,
            100,
          ]);
        }
      }
    }
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
  test.each(["width", "height"] as const)(
    "allows scroll %s to grow during capture",
    async (dimension) => {
      const scrollable = new FakeScrollable();
      const originalScrollTo = scrollable.scrollTo.bind(scrollable);
      vi.spyOn(scrollable, "scrollTo").mockImplementation(async (options) => {
        await originalScrollTo(options);
        scrollable.scrollSize[dimension] += 1;
      });
      const screenshot = await captureScrollableScreenshot(
        scrollable,
        new ScrapingSupport(new AbortController().signal),
        new ProgressManager(vi.fn()),
        { x: 0, y: 3, width: 4, height: 2 },
        { waitForScrollEnd: false, extraWait: 0 },
      );
      expect(
        screenshot.fragments.map((fragment) => fragment.catpureArea),
      ).toEqual([{ x: 0, y: 3, width: 4, height: 2 }]);
      expect(scrollable.scrollCalls).toBe(1);
    },
  );

  test.each(["width", "height"] as const)(
    "keeps client %s changes on the existing fragment retry path",
    async (dimension) => {
      const scrollable = new FakeScrollable();
      const support = new ScrapingSupport(new AbortController().signal);
      vi.spyOn(support, "sleep").mockResolvedValue();
      vi.mocked(captureTabScreenshotAsDataUrl).mockImplementationOnce(() => {
        scrollable.clientBox[dimension] -= 1;
        return Promise.resolve(screenshotDataUrl);
      });
      const screenshot = await captureScrollableScreenshot(
        scrollable,
        support,
        new ProgressManager(vi.fn()),
        { x: 0, y: 3, width: 4, height: 2 },
        { waitForScrollEnd: false, extraWait: 0 },
      );
      expect(
        screenshot.fragments.reduce(
          (area, fragment) =>
            area + fragment.catpureArea.width * fragment.catpureArea.height,
          0,
        ),
      ).toBe(8);
      expect(captureTabScreenshotAsDataUrl).toHaveBeenCalledTimes(3);
    },
  );
  test.each(["width", "height"] as const)(
    "allows scroll %s to shrink while it still contains the requested area",
    async (dimension) => {
      const scrollable = new FakeScrollable();
      scrollable.scrollSize.width = 6;
      const originalScrollTo = scrollable.scrollTo.bind(scrollable);
      vi.spyOn(scrollable, "scrollTo").mockImplementation(async (options) => {
        await originalScrollTo(options);
        scrollable.scrollSize[dimension] -= 1;
      });
      const screenshot = await captureScrollableScreenshot(
        scrollable,
        new ScrapingSupport(new AbortController().signal),
        new ProgressManager(vi.fn()),
        { x: 1, y: 3, width: 2, height: 2 },
        { waitForScrollEnd: false, extraWait: 0 },
      );
      expect(
        screenshot.fragments.map((fragment) => fragment.catpureArea),
      ).toEqual([{ x: 1, y: 3, width: 2, height: 2 }]);
      expect(scrollable.scrollCalls).toBe(1);
    },
  );
  test.each([
    ["width", "scroll size shrinks"],
    ["height", "scroll size shrinks"],
    ["width", "client size grows"],
    ["height", "client size grows"],
  ] as const)(
    "reclamps the %s target on retry when %s and preserves the requested pixels",
    async (dimension, resize) => {
      const horizontal = dimension === "width";
      const scrollable = new FakeScrollable();
      const viewport = horizontal
        ? { width: 320, height: 2 }
        : { width: 2, height: 320 };
      scrollable.clientBox = { x: 0, y: 0, ...viewport };
      scrollable.scrollSize = horizontal
        ? { width: 336, height: 10 }
        : { width: 4, height: 336 };
      if (resize === "client size grows") {
        scrollable.scrollSize[dimension] = 329;
        scrollable.clientBox[dimension] = 313;
      }
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: viewport.width,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: viewport.height,
      });
      const originalScrollTo = scrollable.scrollTo.bind(scrollable);
      const scrollTo = vi
        .spyOn(scrollable, "scrollTo")
        .mockImplementation(async (options) => {
          if (resize === "scroll size shrinks")
            scrollable.scrollSize[dimension] = 329;
          else scrollable.clientBox[dimension] = 320;
          await originalScrollTo({
            ...options,
            left: Math.min(
              options.left ?? 0,
              scrollable.scrollSize.width - scrollable.clientBox.width,
            ),
            top: Math.min(
              options.top ?? 0,
              scrollable.scrollSize.height - scrollable.clientBox.height,
            ),
          });
        });
      vi.mocked(captureTabScreenshotAsDataUrl).mockImplementation(() => {
        const position = scrollable.getScrollPosition();
        const image = new Image(viewport.width, viewport.height);
        for (let row = 0; row < image.height; row++) {
          for (let column = 0; column < image.width; column++) {
            image.setPixel(column, row, [
              (position.left + column) % 256,
              (position.top + row) % 256,
              100,
            ]);
          }
        }
        return Promise.resolve(
          `data:image/png;base64,${uint8ArrayToBase64(encodePng(image))}`,
        );
      });
      const support = new ScrapingSupport(new AbortController().signal);
      vi.spyOn(support, "sleep").mockResolvedValue();
      const requestedArea = horizontal
        ? { x: 16, y: 3, width: 288, height: 2 }
        : { x: 0, y: 16, width: 2, height: 288 };
      const screenshot = await captureScrollableScreenshot(
        scrollable,
        support,
        new ProgressManager(vi.fn()),
        requestedArea,
        { waitForScrollEnd: false, extraWait: 0 },
      );
      expect(
        scrollTo.mock.calls.map(([options]) =>
          horizontal ? options.left : options.top,
        ),
      ).toEqual([16, 9]);
      expect(captureTabScreenshotAsDataUrl).toHaveBeenCalledOnce();
      expect(
        screenshot.fragments.map((fragment) => fragment.catpureArea),
      ).toEqual([requestedArea]);
      const image = decodePng(screenshot.fragments[0]!.screenshotPng);
      expect({ width: image.width, height: image.height }).toEqual({
        width: requestedArea.width,
        height: requestedArea.height,
      });
      for (let row = 0; row < image.height; row++) {
        for (let column = 0; column < image.width; column++) {
          expect(image.getPixel(column, row)).toEqual([
            (requestedArea.x + column) % 256,
            (requestedArea.y + row) % 256,
            100,
          ]);
        }
      }
    },
  );
});
