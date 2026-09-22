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
  const missingAreas = findMissingAreas(requestedArea, screenshotFragments);
  if (missingAreas.length > 0) {
    throw new MissingScreenshotFragmentsError(requestedArea, missingAreas);
  }

  const image = new Image(
    Math.ceil(requestedArea.width),
    Math.ceil(requestedArea.height),
  );

  for (const fragment of screenshotFragments) {
    const intersection = intersectRects(fragment.catpureArea, requestedArea);
    if (!intersection) {
      continue;
    }
    const croppedHeight = Math.round(intersection.height);
    const croppedWidth = Math.round(intersection.width);
    if (croppedHeight === 0 || croppedWidth === 0) {
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
      height: croppedHeight,
      width: croppedWidth,
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

export class MissingScreenshotFragmentsError extends Error {
  constructor(
    readonly requestedArea: Rect,
    readonly missingAreas: Rect[],
  ) {
    super(
      "Cannot build screenshot because captured fragments do not cover the requested area.",
    );
  }
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

function findMissingAreas(
  requestedArea: Rect,
  screenshotFragments: ScreenshotFragment[],
): Rect[] {
  let uncoveredAreas = [requestedArea];

  for (const fragment of screenshotFragments) {
    uncoveredAreas = uncoveredAreas.flatMap((uncoveredArea) =>
      subtractRect(uncoveredArea, fragment.catpureArea),
    );
    if (uncoveredAreas.length === 0) {
      return [];
    }
  }

  return uncoveredAreas;
}

/** Returns the parts of `source` which are not covered by `cover`. */
function subtractRect(source: Rect, cover: Rect): Rect[] {
  const intersection = intersectRects(source, cover);
  if (!intersection) {
    return [source];
  }

  const remainingAreas: Rect[] = [
    {
      x: source.x,
      y: source.y,
      width: source.width,
      height: intersection.y - source.y,
    },
    {
      x: source.x,
      y: intersection.y + intersection.height,
      width: source.width,
      height: source.y + source.height - (intersection.y + intersection.height),
    },
    {
      x: source.x,
      y: intersection.y,
      width: intersection.x - source.x,
      height: intersection.height,
    },
    {
      x: intersection.x + intersection.width,
      y: intersection.y,
      width: source.x + source.width - (intersection.x + intersection.width),
      height: intersection.height,
    },
  ].filter(isEmptyRect);

  return remainingAreas;
}

function isEmptyRect(rect: Rect): boolean {
  return rect.width > 0 && rect.height > 0;
}
