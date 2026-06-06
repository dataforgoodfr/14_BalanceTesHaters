import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  captureScrollableScreenshot,
  imageToDataUrl,
  Scrollable,
} from "@/shared/screenshoting";
import {
  defaultWaitOptions,
  ScreenshotWaitOptions,
  ScrollableScreenshot,
} from "@/shared/screenshoting/scrollable/captureScrollableScreenshot";
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
  console.log(
    `performScreenshotTests - ${referenceCaptureId} - starting capture`,
  );

  const reference = await captureScreenshot(
    scrollable,
    referenceCaptureId,
    options.referenceScreenshotWaitOptions,
  );
  const referenceDataUrl = imageToDataUrl(reference.image);
  await downloadScreenshot(referenceCaptureId, referenceDataUrl);

  for (const cfg of options.tests) {
    for (let i = 0; i < options.iterationsPerConfig; i++) {
      const captureId = `${options.runIdPrefix}-${runId}-${cfg.name}-${i}`;
      console.log(`performScreenshotTests - ${captureId} - starting capture`);
      const screenshot = await captureScreenshot(
        scrollable,
        captureId,
        cfg.waitOptions,
      );
      console.log(`performScreenshotTests - ${captureId} - done.`);
      console.log(`performScreenshotTests - ${captureId} - downloading...`);
      const screenshotDataUrl = imageToDataUrl(screenshot.image);
      const matchesRef = screenshotDataUrl === referenceDataUrl;
      await downloadScreenshot(
        captureId + (matchesRef ? "-ok" : "-ko"),
        screenshotDataUrl,
      );
      if (!matchesRef) {
        console.log(
          `performScreenshotTests - ${captureId} - mismatch downloading diff...`,
        );
        // Diff
        const diff = reference.image.subtract(screenshot.image);
        await downloadScreenshot(captureId + "-diff", imageToDataUrl(diff));
      }

      console.log(`performScreenshotTests - ${captureId} - download done.`);
    }
  }
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
      console.log(
        `performScreenshotTests - ${captureId} - in progress: ${Math.round(progress)}%`,
      ),
    ),
    waitOptions,
  );
  return screenshot;
}
