import type { AttemptResult } from "../types";
import { buildSummary, ratio } from "./buildSummary";
import {
  formatDuration,
  formatInteger,
  formatStatusWithEmoji,
} from "./formatMarkdownValue";

export function buildMarkdownReport(results: AttemptResult[]): string {
  const summary = buildSummary(results);
  const lines = [
    "# Soak-test report",
    "",
    `Attempts: ${results.length}`,
    "",
    `Success rate: ${formatPercent(summary.global.successRate)} (${countSuccessfulStatuses(summary.global.statuses)}/${results.length})`,
    "",
    "## Statuses",
    "",
    "| Status | Count | Rate |",
    "| --- | ---: | ---: |",
  ];
  for (const [status, count] of Object.entries(summary.global.statuses)) {
    lines.push(
      `| ${status} | ${count} | ${formatPercent(ratio(count, results.length))} |`,
    );
  }
  lines.push(
    "",
    "## Scenarios",
    "",
    "| Scenario | Attempts | Successes | Success rate | Median | p95 | Duration per comment |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const [scenarioId, scenario] of Object.entries(summary.scenarios)) {
    const successes = countSuccessfulStatuses(scenario.statuses);
    lines.push(
      `| ${scenarioId} | ${scenario.attempts} | ${successes} | ${formatPercent(ratio(successes, scenario.attempts))} | ${formatDuration(scenario.durationMs.median)} | ${formatDuration(scenario.durationMs.p95)} | ${formatDuration(scenario.averageDurationPerCommentMs)} |`,
    );
  }
  lines.push(
    "",
    "## Attempts",
    "",
    "| Attempt | Status | Scraped | Expected | Δ (expected - scraped) | Duration | Duration per comment |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const result of results) {
    const { commentsStats } = result;
    lines.push(
      `| ${result.attemptId} | ${formatStatusWithEmoji(result.status)} | ${formatInteger(commentsStats.scrapedComments)} | ${formatInteger(commentsStats.expectedComments)} | ${formatCommentDelta(commentsStats)} | ${formatDuration(result.durationMs)} | ${formatDuration(result.averageDurationPerCommentMs)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function countSuccessfulStatuses(
  statuses: Partial<Record<AttemptResult["status"], number>>,
): number {
  return (statuses.success ?? 0) + (statuses.warning ?? 0);
}

function formatCommentDelta(
  commentsStats: AttemptResult["commentsStats"],
): string {
  if (
    commentsStats.expectedComments === undefined ||
    commentsStats.scrapedComments === undefined
  ) {
    return "n/a";
  }
  const delta = commentsStats.expectedComments - commentsStats.scrapedComments;
  const percentage = ratio(delta, commentsStats.expectedComments);
  return `${formatSignedNumber(delta, 0)} (${formatSignedPercent(percentage)})`;
}

function formatSignedNumber(value: number, fractionDigits: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}`;
}

function formatSignedPercent(value: number | undefined): string {
  return value === undefined ? "n/a" : `${formatSignedNumber(value * 100, 1)}%`;
}

function formatPercent(value: number | undefined): string {
  return value === undefined ? "n/a" : `${(value * 100).toFixed(1)}%`;
}
