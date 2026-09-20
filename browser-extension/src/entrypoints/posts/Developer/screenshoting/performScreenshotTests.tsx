import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { Scrollable } from "@/shared/screenshoting";
import {
  captureScrollableScreenshot,
  imageToDataUrl,
} from "@/shared/screenshoting";
import type {
  ScreenshotWaitOptions,
  ScrollableScreenshot,
} from "@/shared/screenshoting/scrollable/captureScrollableScreenshot";
import { defaultWaitOptions } from "@/shared/screenshoting/scrollable/captureScrollableScreenshot";
import { buildImageFromFragments } from "@/shared/screenshoting/scrollable/buildImageFromFragments";
import { createLogger } from "@/shared/utils/createLogger";

const logger = createLogger("screenshot-tests");
export type ScreenshotTestConfig = {
  name: string;
  waitOptions: ScreenshotWaitOptions;
};

export const configsUnderTest: ScreenshotTestConfig[] = [
  {
    name: "default",
    waitOptions: defaultWaitOptions,
  },
];

/**
 * Performs screenshot testing:
 * 1/ Captures and download a reference snapshot using referenceScreenshotWaitOptions.
 * 2/ For each config in <tests> array runs <iterationsPerConfig> iterations each:
 *    2.1/ Capturing screenshot using the test waitOptions config
 *    2.2/ Comparing screenshot to reference
 *    2.3/ Downloading screenshot with a ok suffix if matches reference or ko suffix if not
 *    2.4/ Downloading a diff image
 * @param scrollable
 * @param options
 */
export async function performScreenshotTests(
  scrollable: Scrollable,
  options: {
    runIdPrefix: string;
    referenceScreenshotWaitOptions: ScreenshotWaitOptions;
    tests: ScreenshotTestConfig[];
    iterationsPerConfig: number;
  },
) {
  const startDate = new Date().toISOString();
  const runId = startDate
    .substring(0, startDate.lastIndexOf(":"))
    .replaceAll(":", "")
    .replaceAll("T", "")
    .replaceAll("-", "");

  const referenceCaptureId = `${options.runIdPrefix}-${runId}-reference`;
  logger.debug(
    `performScreenshotTests - ${referenceCaptureId} - starting capture`,
  );

  const reference = await captureScreenshot(
    scrollable,
    referenceCaptureId,
    options.referenceScreenshotWaitOptions,
  );
  const referenceImage = buildFullScreenshotImage(reference);
  const referenceDataUrl = imageToDataUrl(referenceImage);
  await downloadScreenshot(referenceCaptureId, referenceDataUrl);

  for (const cfg of options.tests) {
    for (let i = 0; i < options.iterationsPerConfig; i++) {
      const captureId = `${options.runIdPrefix}-${runId}-${cfg.name}-${i}`;
      logger.debug(`performScreenshotTests - ${captureId} - starting capture`);
      const screenshot = await captureScreenshot(
        scrollable,
        captureId,
        cfg.waitOptions,
      );
      logger.debug(`performScreenshotTests - ${captureId} - done.`);
      logger.debug(`performScreenshotTests - ${captureId} - downloading...`);
      const capturedImage = buildFullScreenshotImage(screenshot);
      const screenshotDataUrl = imageToDataUrl(capturedImage);
      const matchesRef = screenshotDataUrl === referenceDataUrl;
      await downloadScreenshot(
        captureId + (matchesRef ? "-ok" : "-ko"),
        screenshotDataUrl,
      );
      if (!matchesRef) {
        logger.debug(
          `performScreenshotTests - ${captureId} - mismatch downloading diff...`,
        );
        // Diff
        const diff = referenceImage.subtract(capturedImage);
        await downloadScreenshot(captureId + "-diff", imageToDataUrl(diff));
      }

      logger.debug(`performScreenshotTests - ${captureId} - download done.`);
    }
  }
}

function buildFullScreenshotImage(screenshot: ScrollableScreenshot) {
  const lastFragment = screenshot.fragments.at(-1);
  if (!lastFragment) {
    throw new Error("Screenshot has no fragments.");
  }
  return buildImageFromFragments(screenshot.fragments, {
    x: 0,
    y: 0,
    width: lastFragment.catpureArea.x + lastFragment.catpureArea.width,
    height: lastFragment.catpureArea.y + lastFragment.catpureArea.height,
  });
}
async function downloadScreenshot(fileBaseName: string, dataUrl: string) {
  await browser.downloads.download({
    filename: `${fileBaseName}.png`,
    url: dataUrl,
  });
}

async function captureScreenshot(
  scrollable: Scrollable,
  captureId: string,
  waitOptions: ScreenshotWaitOptions,
): Promise<ScrollableScreenshot> {
  const ctrl = new AbortController();
  const support = new ScrapingSupport(ctrl.signal);
  const screenshot = await captureScrollableScreenshot(
    scrollable,
    support,
    new ProgressManager((progress) =>
      logger.debug(
        `performScreenshotTests - ${captureId} - in progress: ${Math.round(progress)}%`,
      ),
    ),
    waitOptions,
  );
  return screenshot;
}
