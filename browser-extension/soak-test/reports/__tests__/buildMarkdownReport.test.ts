import { describe, expect, it } from "vitest";
import { buildMarkdownReport } from "../buildMarkdownReport";
import type { AttemptResult } from "../../types";

describe("buildMarkdownReport", () => {
  it("shows scenario timing per comment and the expected minus scraped delta", () => {
    const result: AttemptResult = {
      attemptId: "youtube-001",
      scenarioId: "youtube",
      platform: "youtube",
      url: "https://www.youtube.com/watch?v=example",
      repetition: 1,
      status: "warning",
      startedAt: new Date().toISOString(),
      durationMs: 10_000,
      averageDurationPerCommentMs: 100,
      commentsStats: {
        expectedComments: 101,
        scrapedComments: 100,
        topLevelComments: 80,
        replyComments: 20,
      },
    };

    const report = buildMarkdownReport([result]);

    expect(report).toContain(
      "| Scenario | Attempts | Successes | Success rate | Median | p95 | Duration per comment |",
    );
    expect(report).toContain(
      "| youtube | 1 | 1 | 100.0% | 10.0 s | 10.0 s | 0.1 s |",
    );
    expect(report).toContain(
      "| Attempt | Status | Scraped | Expected | Δ (expected - scraped) | Duration | Duration per comment |",
    );
    expect(report).toContain(
      "| youtube-001 | 🟠 warning | 100 | 101 | +1 (+1.0%) | 10.0 s | 0.1 s |",
    );
    expect(report).not.toContain("| Root | Replies |");
  });
});
