import { Image } from "image-js";
import { ScreenshotFragment } from "./ScreenshotFragment";
import { Size } from "../Size";

export function buildFullImageFromFragments(
  screenshotFragments: ScreenshotFragment[],
): Image {
  const { width, height }: Size = catpuredAreaSize(screenshotFragments);

  let fullPageImage = new Image(Math.ceil(width), Math.ceil(height));

  for (const ps of screenshotFragments) {
    let partialImage = ps.screenshotImage;
    // Screencapture can be subpixel resolution (1 css pixel = n captured image pixels)
    // Resize to 1ccs pixel = 1 image pixel

    // TODO Shouldn't we resize the full image for better resize results on stiches?
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
function catpuredAreaSize(screenshotFragments: ScreenshotFragment[]): Size {
  return screenshotFragments.reduce(
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
}

function max(a: number, b: number): number {
  return a > b ? a : b;
}
