import type { AttemptResult, AttemtpStatus } from "../types";

type NumericDistribution = {
  p5: number | undefined;
  median: number | undefined;
  p95: number | undefined;
};

export type SoakTestSummary = {
  global: SoakTestAttemptsStats;
  scenarios: Record<string, SoakTestAttemptsStats>;
};

export type SoakTestAttemptsStats = {
  attempts: number;
  successRate: number | undefined;
  statuses: Partial<Record<AttemtpStatus, number>>;
  durationMs: NumericDistribution;
  averageDurationPerCommentMs: number | undefined;
  commentCountDelta: NumericDistribution;
  commentCountRatio: NumericDistribution;
  successfulAttemptsWithinCountDifference: {
    onePercent: number | undefined;
    fivePercent: number | undefined;
    tenPercent: number | undefined;
  };
};

export function buildSummary(results: AttemptResult[]): SoakTestSummary {
  const globalStats: SoakTestAttemptsStats = buildAttemptsStats(results);
  return {
    global: globalStats,
    scenarios: Object.fromEntries(
      [...new Set(results.map((result) => result.scenarioId))].map(
        (scenarioId) => {
          const scenarioResults = results.filter(
            (result) => result.scenarioId === scenarioId,
          );
          return [scenarioId, buildAttemptsStats(scenarioResults)];
        },
      ),
    ),
  };
}

function buildAttemptsStats(results: AttemptResult[]): SoakTestAttemptsStats {
  const statuses = countStatuses(results);
  const successes = results.filter(
    (result) => result.status === "success" || result.status === "warning",
  );
  const percentageDifferences = successes
    .map((result) => result.commentsStats.absolutePercentageDifference)
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  const countDeltas = successes
    .map((result) => result.commentsStats.countDelta)
    .filter((value): value is number => value !== undefined);
  const countRatios = successes
    .map((result) => result.commentsStats.countRatio)
    .filter((value): value is number => value !== undefined);

  const successDurations = sum(successes.map((result) => result.durationMs));
  const successCommentsCount = sum(
    successes.map((result) => result.commentsStats.scrapedComments || 0),
  );

  const averageDurationPerCommentMs =
    successCommentsCount !== 0
      ? successDurations / successCommentsCount
      : undefined;
  return {
    attempts: results.length,
    successRate: ratio(successes.length, results.length),
    statuses,
    durationMs: distribution(results.map((result) => result.durationMs)),
    averageDurationPerCommentMs,
    commentCountDelta: distribution(countDeltas),
    commentCountRatio: distribution(countRatios),
    successfulAttemptsWithinCountDifference: {
      onePercent: ratio(
        percentageDifferences.filter((value) => value <= 1).length,
        percentageDifferences.length,
      ),
      fivePercent: ratio(
        percentageDifferences.filter((value) => value <= 5).length,
        percentageDifferences.length,
      ),
      tenPercent: ratio(
        percentageDifferences.filter((value) => value <= 10).length,
        percentageDifferences.length,
      ),
    },
  };
}

function countStatuses(
  results: AttemptResult[],
): Partial<Record<AttemtpStatus, number>> {
  const counts: Partial<Record<AttemtpStatus, number>> = {};
  for (const result of results) {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
  }
  return counts;
}

function distribution(values: number[]): NumericDistribution {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p5: percentile(sorted, 0.05),
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
  };
}

export function ratio(
  numerator: number,
  denominator: number,
): number | undefined {
  return denominator === 0 ? undefined : numerator / denominator;
}
export function percentile(sorted: number[], percentileValue: number) {
  if (sorted.length === 0) {
    return undefined;
  }
  const index = Math.ceil(percentileValue * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function sum(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
