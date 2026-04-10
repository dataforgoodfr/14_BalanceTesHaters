import { captureTabScreenshotAsDataUrl } from "@/shared/native-screenshoting/cs/screenshot-cs-tab";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/shared/utils/base-64";
import { extractBase64DataFromDataUrl } from "@/shared/utils/data-url";
import { decodePng, encodePng } from "image-js";

const LOG_PREFIX = "[CS - InstagramCommentScreenshotCapture] ";

type CaptureInstagramCommentScreenshotsParams = {
  comments: CommentSnapshot[];
  commentElementsById: Map<string, HTMLElement>;
  scrapingSupport: ScrapingSupport;
  progressManager: ProgressManager;
  debug?: (...data: unknown[]) => void;
};

export async function captureInstagramCommentScreenshots({
  comments,
  commentElementsById,
  scrapingSupport,
  progressManager,
  debug,
}: CaptureInstagramCommentScreenshotsParams): Promise<void> {
  const log = (...data: unknown[]) =>
    (debug ?? console.debug)(LOG_PREFIX, ...data);
  const warn = (...data: unknown[]) => console.warn(LOG_PREFIX, ...data);

  const flatComments = flattenComments(comments);
  if (flatComments.length === 0) {
    progressManager.setProgress(100);
    return;
  }

  const perCommentProgress = progressManager.subTaskProgressManager({
    from: 0,
    to: 100,
  });

  for (let i = 0; i < flatComments.length; i += 1) {
    const comment = flatComments[i];
    try {
      await scrapingSupport.resumeHostPage();

      const targetElement = commentElementsById.get(comment.id);
      if (!targetElement) {
        continue;
      }

      const screenshotElement = resolveScreenshotElement(targetElement);
      screenshotElement.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
      await scrapingSupport.sleep(150);

      const screenshotDataUrl = await captureTabScreenshotAsDataUrl();
      const screenshotData = cropVisibleElementAsPngBase64(
        screenshotElement,
        screenshotDataUrl,
      );
      if (screenshotData) {
        comment.screenshotData = screenshotData;
      }
    } catch (e) {
      warn("Failed to capture screenshot for Instagram comment", {
        commentId: comment.id,
        error: String(e),
      });
    } finally {
      perCommentProgress.setProgress(((i + 1) / flatComments.length) * 100);
    }
  }

  log(
    `Captured screenshots for ${flatComments.filter((c) => c.screenshotData).length}/${flatComments.length} comments`,
  );
}

function flattenComments(comments: CommentSnapshot[]): CommentSnapshot[] {
  return comments.flatMap((comment) => [
    comment,
    ...flattenComments(comment.replies),
  ]);
}

function resolveScreenshotElement(element: HTMLElement): HTMLElement {
  let fallbackCandidate: HTMLElement | undefined;
  let current: HTMLElement | null = element;
  for (let i = 0; i < 6 && current; i += 1) {
    if (isValidCommentCaptureContainer(current)) {
      return current;
    }
    if (!fallbackCandidate && isFallbackCaptureContainer(current)) {
      fallbackCandidate = current;
    }
    const nextParentElement: HTMLElement | null = current.parentElement;
    if (!nextParentElement || nextParentElement === document.body) {
      break;
    }
    current = nextParentElement;
  }

  return fallbackCandidate ?? element;
}

function isValidCommentCaptureContainer(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (
    rect.width < 210 ||
    rect.width > window.innerWidth * 0.6 ||
    rect.height < 32 ||
    rect.height > window.innerHeight * 0.6
  ) {
    return false;
  }
  if (rect.x < window.innerWidth * 0.2) {
    return false;
  }
  const timeCount = element.querySelectorAll("time[datetime]").length;
  if (timeCount < 1 || timeCount > 3) {
    return false;
  }

  const accountLinkCount = element.querySelectorAll("a[href^='/']").length;
  if (accountLinkCount < 1 || accountLinkCount > 8) {
    return false;
  }

  const nestedListCount = element.querySelectorAll("li").length;
  if (nestedListCount > 2) {
    return false;
  }

  return true;
}

function isFallbackCaptureContainer(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 180 || rect.height < 24) {
    return false;
  }
  if (rect.width > window.innerWidth * 0.72) {
    return false;
  }
  if (rect.height > window.innerHeight * 0.82) {
    return false;
  }
  return true;
}

function cropVisibleElementAsPngBase64(
  element: HTMLElement,
  screenshotDataUrl: string,
): string | undefined {
  const image = decodePng(
    base64ToUint8Array(extractBase64DataFromDataUrl(screenshotDataUrl)),
  );
  const rect = element.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) {
    return undefined;
  }

  const paddingX = 12;
  const paddingY = 8;
  const leftCss = Math.max(0, rect.x - paddingX);
  const topCss = Math.max(0, rect.y - paddingY);
  const rightCss = Math.min(window.innerWidth, rect.x + rect.width + paddingX);
  const bottomCss = Math.min(
    window.innerHeight,
    rect.y + rect.height + paddingY,
  );
  if (rightCss <= leftCss || bottomCss <= topCss) {
    return undefined;
  }

  // captureVisibleTab can return an image in device pixels (HiDPI),
  // while getBoundingClientRect uses CSS pixels. Convert coordinates.
  const scaleX = image.width / window.innerWidth;
  const scaleY = image.height / window.innerHeight;

  const x = Math.max(0, Math.floor(leftCss * scaleX));
  const y = Math.max(0, Math.floor(topCss * scaleY));
  const width = Math.min(
    image.width - x,
    Math.ceil((rightCss - leftCss) * scaleX),
  );
  const height = Math.min(
    image.height - y,
    Math.ceil((bottomCss - topCss) * scaleY),
  );
  if (width <= 0 || height <= 0) {
    return undefined;
  }

  const cropped = image.crop({
    origin: { column: x, row: y },
    width,
    height,
  });
  return uint8ArrayToBase64(encodePng(cropped));
}
