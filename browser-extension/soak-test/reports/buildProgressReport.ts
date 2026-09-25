import {
  getAverageDurationPerCommentMs,
  getLifecycleSummary,
} from "../../src/shared/soak-test/SoakTestMetrics";
import type {
  SoakControllerAttempt,
  SoakControllerObservation,
  SoakControllerResult,
} from "../../src/shared/soak-test/SoakTestProtocol";
import {
  formatDuration,
  formatInteger,
  formatStatusWithEmoji,
} from "./formatMarkdownValue";

export type ServerAttemptProgress = {
  attempt: SoakControllerAttempt;
  phase: "waiting" | "running" | "completed" | "aborted" | "not-run";
  observation?: SoakControllerObservation;
  expectedComments?: number;
  result?: SoakControllerResult;
  error?: string;
};

export function buildProgressReport(attempts: ServerAttemptProgress[]): string {
  const completed = attempts.filter(
    (attempt) => attempt.phase === "completed",
  ).length;
  const lines = [
    "# Soak-test progress",
    "",
    `Updated: ${new Date().toISOString()}`,
    "",
    `Completed: ${completed}/${attempts.length}`,
    "",
    "| Attempt | Status | Expected | Scraped | Duration | Duration per comment | Progress |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const attempt of attempts) {
    const result = attempt.result;
    lines.push(
      `| ${attempt.attempt.attemptId} | ${formatStatus(attempt)} | ${formatInteger(attempt.expectedComments ?? result?.expectedComments)} | ${formatInteger(result?.scrapedComments)} | ${formatTotalDuration(attempt)} | ${formatDuration(result && getAverageDurationPerCommentMs(result), 2)} | ${formatProgress(attempt)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function formatTotalDuration(attempt: ServerAttemptProgress): string {
  if (attempt.result) return formatDuration(attempt.result.durationMs, 2);
  if (attempt.phase === "running" && attempt.observation) {
    return `${formatDuration(attempt.observation.elapsedMs, 2)}...`;
  }
  return "n/a";
}

function formatStatus(attempt: ServerAttemptProgress): string {
  const status = attempt.result ? attempt.result.status : attempt.phase;
  return formatStatusWithEmoji(status);
}

function formatProgress(attempt: ServerAttemptProgress): string {
  if (attempt.error) return sanitizeCell(attempt.error);
  const observation = attempt.observation;
  if (!observation) return attempt.phase;
  if (
    attempt.result?.status === "success" ||
    attempt.result?.status === "warning" ||
    observation.status?.type === "succeeded"
  ) {
    return observation.loadedDomComments === undefined
      ? "n/a"
      : `${observation.loadedDomComments} DOM comments`;
  }
  const details: string[] = [];
  if (observation.status?.type === "running") {
    details.push(`${Math.round(observation.status.progress)}%`);
  } else if (observation.status) {
    details.push(observation.status.type);
  }
  if (observation.loadedDomComments !== undefined) {
    details.push(`${observation.loadedDomComments} DOM comments`);
  }
  const lifecycleSummary = getLifecycleSummary(observation);
  const progressSummary = details.join(" / ") || attempt.phase;
  return lifecycleSummary
    ? `${progressSummary}<br>${lifecycleSummary}`
    : progressSummary;
}

function sanitizeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
