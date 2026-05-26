import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { Image, encodePng } from "image-js";
import { logPrefix } from "./captureScrollableScreenshot";
import { currentIsoDate } from "@/shared/utils/current-iso-date";

export async function setStoreDebugScreenshots(
  storeForDebug: boolean,
): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEY_ENABLE_DEBUG_SCREENSHOTS]: storeForDebug,
  });
}
export async function isStoreDebugScreenshots(): Promise<boolean> {
  return (
    await browser.storage.local.get(STORAGE_KEY_ENABLE_DEBUG_SCREENSHOTS)
  )[STORAGE_KEY_ENABLE_DEBUG_SCREENSHOTS] as boolean;
}
export async function maybeStoreDebugScreenshot(
  screenshot: Image,
  type:
    | "tab-image"
    | "scrollable-fragment"
    | "scrollable-full"
    | "scrollable-cropped",
) {
  if (!(await isStoreDebugScreenshots())) {
    return;
  }
  console.info(logPrefix, "Storing screenshot for debugging purpose...");
  const dataUrl = buildDataUrl(
    uint8ArrayToBase64(encodePng(screenshot)),
    PNG_MIME_TYPE,
  );
  const screenshots: DebugScreenshot[] = (await getDebugScreenshots()) || [];
  screenshots.push({
    screenshotDataUrl: dataUrl,
    screenshotDate: currentIsoDate(),
    type,
  });
  await browser.storage.local.set({
    [STORAGE_KEY_DEBUG_SCREENSHOTS]: screenshots,
  });
}

export type DebugScreenshot = {
  screenshotDataUrl: string;
  screenshotDate: string;
  type: string;
};

export async function getDebugScreenshots(): Promise<DebugScreenshot[]> {
  const value = (
    await browser.storage.local.get(STORAGE_KEY_DEBUG_SCREENSHOTS)
  )[STORAGE_KEY_DEBUG_SCREENSHOTS];
  return (value || []) as DebugScreenshot[];
}

export async function clearDebugScreenshots() {
  await browser.storage.local.set({
    [STORAGE_KEY_DEBUG_SCREENSHOTS]: [],
  });
}

export const STORAGE_KEY_ENABLE_DEBUG_SCREENSHOTS =
  "debug.enableDebugScreenshots";
export const STORAGE_KEY_DEBUG_SCREENSHOTS = "debug.debugScreenshots";
