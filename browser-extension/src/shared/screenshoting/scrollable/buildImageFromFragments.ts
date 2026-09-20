import { decodePng, Image } from "image-js";
import type { ScreenshotFragment } from "./ScreenshotFragment";
import type { Rect } from "./ScreenshotFragment";

/**
 * Builds an image for one document rectangle from the screenshot fragments.
 *
 * The destination is limited to the requested rectangle.
 */
export function buildImageFromFragments(
  screenshotFragments: ScreenshotFragment[],
  requestedArea: Rect,
): Image {
  const image = new Image(
    Math.ceil(requestedArea.width),
    Math.ceil(requestedArea.height),
  );

  for (const fragment of screenshotFragments) {
    const intersection = intersectRects(fragment.catpureArea, requestedArea);
    if (!intersection) {
      continue;
    }

    // Screencapture can be high resolution. Normalize each fragment only while
    // it is needed, then let it be collected before processing the next one.
    const decodedFragment = decodePng(fragment.screenshotPng);
    const width = Math.round(fragment.catpureArea.width);
    const height = Math.round(fragment.catpureArea.height);
    const fragmentImage =
      decodedFragment.width === width && decodedFragment.height === height
        ? decodedFragment
        : decodedFragment.resize({ height, width });
    const croppedFragment = fragmentImage.crop({
      origin: {
        column: Math.round(intersection.x - fragment.catpureArea.x),
        row: Math.round(intersection.y - fragment.catpureArea.y),
      },
      height: Math.round(intersection.height),
      width: Math.round(intersection.width),
    });
    croppedFragment.copyTo(image, {
      origin: {
        row: Math.round(intersection.y - requestedArea.y),
        column: Math.round(intersection.x - requestedArea.x),
      },
      // image-js clones its destination by default. Reusing it avoids an
      // allocation proportional to the comment screenshot for every fragment.
      out: image,
    });
  }

  return image;
}

function intersectRects(first: Rect, second: Rect): Rect | undefined {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);

  if (right <= left || bottom <= top) {
    return undefined;
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}
