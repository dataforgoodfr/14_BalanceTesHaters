// @vitest-environment happy-dom

import { decodePng, encodePng, Image } from "image-js";
import { describe, expect, test, vi } from "vitest";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import type { Size } from "../../Size";
import type {
  Position,
  Scrollable,
  ScrollableScrollToOptions,
} from "../Scrollable";
import { captureScrollableScreenshot } from "../captureScrollableScreenshot";

vi.mock("../../tab/captureTabScreenshotAsDataUrl", () => ({
  captureTabScreenshotAsDataUrl: vi.fn(() => {
    const image = new Image(4, 2);
    return Promise.resolve(
      `data:image/png;base64,${uint8ArrayToBase64(encodePng(image))}`,
    );
  }),
}));

vi.mock("../../debug/debugScreenshots", () => ({
  maybeStoreDebugScreenshot: vi.fn(),
}));

class FakeScrollable implements Scrollable {
  private top = 0;

  getClientSize(): Size {
    return { width: 4, height: 2 };
  }

  getScrollSize(): Size {
    return { width: 4, height: 10 };
  }

  getScrollPosition(): Position {
    return { top: this.top, left: 0 };
  }

  scrollTo(options: ScrollableScrollToOptions): Promise<void> {
    this.top = options.top ?? this.top;
    return Promise.resolve();
  }

  cropToElement(image: Image, _tabInnerSize: Size): Image {
    return image;
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

describe("captureScrollableScreenshot", () => {
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

  test("does not retain overlapping pixels when the last scroll is clamped", async () => {
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
});
