import { encodePng, Image } from "image-js";
import { describe, expect, it } from "vitest";
import { buildImageFromFragments } from "../buildImageFromFragments";
import type { ScreenshotFragment } from "../ScreenshotFragment";

function createFragment(
  y: number,
  pixels: Array<Array<number[]>>,
): ScreenshotFragment {
  const image = new Image(pixels[0]!.length, pixels.length);
  for (const [row, rowPixels] of pixels.entries()) {
    for (const [column, pixel] of rowPixels.entries()) {
      image.setPixel(column, row, pixel);
    }
  }

  return {
    catpureArea: { x: 0, y, width: image.width, height: image.height },
    screenshotPng: encodePng(image),
  };
}

describe("buildImageFromFragments", () => {
  it("assembles only the requested area when it crosses two fragments", () => {
    const fragments = [
      createFragment(0, [
        [
          [255, 0, 0],
          [0, 255, 0],
        ],
        [
          [0, 0, 255],
          [255, 255, 0],
        ],
      ]),
      createFragment(2, [
        [
          [255, 0, 255],
          [0, 255, 255],
        ],
        [
          [255, 255, 255],
          [0, 0, 0],
        ],
      ]),
    ];

    const image = buildImageFromFragments(fragments, {
      x: 0,
      y: 1,
      width: 2,
      height: 2,
    });

    expect(image.width).toBe(2);
    expect(image.height).toBe(2);
    expect(image.getPixel(0, 0)).toEqual([0, 0, 255]);
    expect(image.getPixel(1, 0)).toEqual([255, 255, 0]);
    expect(image.getPixel(0, 1)).toEqual([255, 0, 255]);
    expect(image.getPixel(1, 1)).toEqual([0, 255, 255]);
  });
});
