import { describe, expect, it } from "vitest";
import {
  getAverageDurationPerCommentMs,
  getLifecycleSummary,
  refineSuccessStatus,
} from "../SoakTestMetrics";
import type { SoakControllerResult } from "../SoakTestProtocol";

const baseResult: SoakControllerResult = {
  attempt: {
    attemptId: "youtube-001",
    scenarioId: "youtube",
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=example",
    repetition: 1,
    hardTimeoutMs: 600_000,
  },
  status: "success",
  startedAt: new Date().toISOString(),
  durationMs: 10_000,
  scrapedComments: 100,
};

describe("SoakTestMetrics", () => {
  it("returns warning when expected and scraped counts differ", () => {
    expect(refineSuccessStatus(101, 100)).toBe("warning");
  });

  it("returns success when counts match or the expected count is unavailable", () => {
    expect(refineSuccessStatus(100, 100)).toBe("success");
    expect(refineSuccessStatus(undefined, 100)).toBe("success");
  });

  it("calculates duration per scraped comment", () => {
    expect(getAverageDurationPerCommentMs(baseResult)).toBe(100);
    expect(
      getAverageDurationPerCommentMs({ ...baseResult, scrapedComments: 0 }),
    ).toBeUndefined();
  });

  it("summarizes page and tab lifecycle state", () => {
    expect(
      getLifecycleSummary({
        recordedAt: new Date().toISOString(),
        elapsedMs: 1000,
        contentScriptReachable: true,
        pageVisibilityState: "hidden",
        documentHasFocus: false,
        tabActive: false,
        windowFocused: false,
        tabFrozen: true,
        tabDiscarded: false,
      }),
    ).toBe(
      "page hidden · document unfocused · tab inactive · window unfocused · tab frozen",
    );
  });
});
