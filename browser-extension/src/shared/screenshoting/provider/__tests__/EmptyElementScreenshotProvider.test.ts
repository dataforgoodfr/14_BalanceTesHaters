import { describe, expect, it } from "vitest";
import { EmptyElementScreenshotProvider } from "../EmptyElementScreenshotProvider";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";

describe("EmptyElementScreenshotProvider", () => {
  it("provides a transparent one-pixel image", async () => {
    const provider = new EmptyElementScreenshotProvider();

    const [image] = await provider.buildElementScreenshots(
      [{} as HTMLElement],
      new ProgressManager(() => undefined),
    );

    expect(image!.width).toBe(1);
    expect(image!.height).toBe(1);
    expect(image!.getPixel(0, 0)).toEqual([0, 0, 0, 0]);
  });
});
