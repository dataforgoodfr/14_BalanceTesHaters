import { Image, decodePng } from "image-js";
import { base64ToUint8Array } from "../../utils/base-64";
import { extractBase64DataFromDataUrl } from "../../utils/data-url";
import { ScreenshotFragment } from "./screenshot-fragment";

export function buildFullImageFromFragments(
  screenshotFragments: ScreenshotFragment[],
): Image {
  function max(a: number, b: number): number {
    return a > b ? a : b;
  }
  // Compute total width/height
  const { width, height } = screenshotFragments.reduce(
    (
      { width: previousWidth, height: previousHeight },
      screenshot: ScreenshotFragment,
    ) => ({
      width: max(
        previousWidth,
        screenshot.catpureArea.width + screenshot.catpureArea.x,
      ),
      height: max(
        previousHeight,
        screenshot.catpureArea.height + screenshot.catpureArea.y,
      ),
    }),
    { width: 0, height: 0 },
  );
  let fullPageImage = new Image(Math.ceil(width), Math.ceil(height));

  for (const ps of screenshotFragments) {
    let partialImage = decodePng(
      base64ToUint8Array(extractBase64DataFromDataUrl(ps.screenshotDataUrl)),
    );
    // Screencapture sometimes taken with subpixel resolution
    partialImage = partialImage.resize({
      height: Math.floor(ps.catpureArea.height),
      width: Math.floor(ps.catpureArea.width),
    });
    fullPageImage = partialImage.copyTo(fullPageImage, {
      origin: {
        row: Math.floor(ps.catpureArea.y),
        column: Math.floor(ps.catpureArea.x),
      },
    });
  }
  return fullPageImage;
}
