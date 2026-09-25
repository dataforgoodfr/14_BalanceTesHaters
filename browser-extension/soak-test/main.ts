import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  SoakControllerAttempt,
  SoakControllerResult,
} from "../src/shared/soak-test/SoakTestProtocol";
import { getAverageDurationPerCommentMs } from "../src/shared/soak-test/SoakTestMetrics";
import { filterScenarios, parseRunnerOptions, readManifest } from "./config";
import { startExtensionControllerServer } from "./startExtensionControllerServer";
import type { AttemptResult, SoakTestScenario } from "./types";
import { buildMarkdownReport } from "./reports/buildMarkdownReport";
import { buildSummary } from "./reports/buildSummary";
import {
  buildProgressReport,
  type ServerAttemptProgress,
} from "./reports/buildProgressReport";

async function main() {
  const options = parseRunnerOptions(process.argv.slice(2));
  const manifest = await readManifest(options.manifestPath);
  const scenarios = filterScenarios(manifest.scenarios, options);
  const outputDirectory = path.resolve(
    options.outputDirectory ??
      path.join("soak-test-results", safeTimestamp(new Date())),
  );
  await mkdir(outputDirectory, { recursive: true });
  const attempts = buildAttempts(scenarios, options.runs);
  const results: AttemptResult[] = [];
  const controller = await startExtensionControllerServer({
    outputDirectory,
    config: {
      attempts,
      stallTimeoutMs: options.stallTimeoutMs,
      pollIntervalMs: options.pollIntervalMs,
      postSnapshotCleanup: options.postSnapshotCleanup,
    },
    onResult: async (extensionResult) => {
      const result = toAttemptResult(extensionResult);
      results.push(result);
      const attemptDirectory = path.join(
        outputDirectory,
        "attempts",
        result.attemptId,
      );
      await mkdir(attemptDirectory, { recursive: true });
      await writeFile(
        path.join(attemptDirectory, "result.json"),
        JSON.stringify(result, null, 2) + "\n",
      );
      await Promise.all([
        writeSummary(outputDirectory, results),
        writeReport(outputDirectory, results),
      ]);
      console.info(
        `[soak-test] ${result.attemptId}: ${result.status} in ${(result.durationMs / 1000).toFixed(1)}s`,
      );
    },
    onProgress: async (attempts: ServerAttemptProgress[]) => {
      await writeProgressReport(outputDirectory, attempts);
    },
  });
  try {
    await writeFile(
      path.join(outputDirectory, "run.json"),
      JSON.stringify(
        {
          startedAt: new Date().toISOString(),
          options,
          browserExecutablePath: process.env.CHROMIUM_BIN,
          scenarios,
        },
        null,
        2,
      ) + "\n",
    );
    console.info(
      "[soak-test] Waiting for the soak controller in the already-open authenticated browser...",
    );
    await Promise.race([
      controller.ready,
      rejectAfter(
        300_000,
        "The extension controller did not connect within five minutes. Open or reload the soak extension in the authenticated profile.",
      ),
    ]);
    await controller.completion;
  } finally {
    await controller.close();
  }
  console.info(
    `[soak-test] Report: ${path.join(outputDirectory, "report.md")}`,
  );
  if (
    results.some(
      (result) => result.status !== "success" && result.status !== "warning",
    )
  ) {
    process.exitCode = 1;
  }
}

function toAttemptResult(result: SoakControllerResult): AttemptResult {
  return {
    attemptId: result.attempt.attemptId,
    scenarioId: result.attempt.scenarioId,
    platform: result.attempt.platform,
    url: result.attempt.url,
    repetition: result.attempt.repetition,
    status: result.status,
    startedAt: result.startedAt,
    durationMs: result.durationMs,
    averageDurationPerCommentMs: getAverageDurationPerCommentMs(result),
    lastObservation: result.lastObservation,
    scraperError: result.scraperError,
    harnessError: result.harnessError,
    commentsStats: {
      expectedComments: result.expectedComments,
      scrapedComments: result.scrapedComments,
      topLevelComments: result.topLevelComments,
      replyComments: result.replyComments,
      ...buildCountStatistics(result.expectedComments, result.scrapedComments),
    },
  };
}

function buildCountStatistics(
  expectedComments: number | undefined,
  scrapedComments: number | undefined,
): Pick<
  AttemptResult["commentsStats"],
  "countDelta" | "countRatio" | "absolutePercentageDifference"
> {
  if (expectedComments === undefined || scrapedComments === undefined) {
    return {};
  }
  const countDelta = scrapedComments - expectedComments;
  return {
    countDelta,
    countRatio:
      expectedComments === 0 ? undefined : scrapedComments / expectedComments,
    absolutePercentageDifference:
      expectedComments === 0
        ? undefined
        : (Math.abs(countDelta) / expectedComments) * 100,
  };
}

function buildAttempts(
  scenarios: SoakTestScenario[],
  runs: number,
): SoakControllerAttempt[] {
  return scenarios.flatMap((scenario) =>
    Array.from({ length: runs }, (_, index) => ({
      attemptId: `${scenario.id}-${String(index + 1).padStart(3, "0")}`,
      scenarioId: scenario.id,
      platform: scenario.platform,
      url: scenario.url,
      repetition: index + 1,
      hardTimeoutMs: scenario.approximateExpectedComments * 60_000,
    })),
  );
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function rejectAfter(durationMs: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), durationMs);
  });
}

async function writeSummary(
  outputDirectory: string,
  results: AttemptResult[],
): Promise<void> {
  await writeFile(
    path.join(outputDirectory, "summary.json"),
    JSON.stringify(buildSummary(results), null, 2) + "\n",
  );
}

async function writeReport(
  outputDirectory: string,
  results: AttemptResult[],
): Promise<void> {
  await writeFile(
    path.join(outputDirectory, "report.md"),
    buildMarkdownReport(results),
  );
}
async function writeProgressReport(
  outputDirectory: string,
  attempts: ServerAttemptProgress[],
): Promise<void> {
  await writeFile(
    path.join(outputDirectory, "progress.md"),
    buildProgressReport(attempts),
  );
}

void main().catch((error: unknown) => {
  console.error(
    "[soak-test] Preflight or runner failure:",
    error instanceof Error ? error.stack : error,
  );
  process.exitCode = 2;
});
