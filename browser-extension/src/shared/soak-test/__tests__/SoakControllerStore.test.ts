import { describe, expect, it, vi } from "vitest";
import { SoakControllerStore } from "../../../shared/soak-test/SoakControllerStore";
import type {
  SoakControllerAttempt,
  SoakControllerResult,
} from "../../../shared/soak-test/SoakTestProtocol";

const attempts: SoakControllerAttempt[] = [
  {
    attemptId: "youtube-large-001",
    scenarioId: "youtube-large",
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=first",
    repetition: 1,
    hardTimeoutMs: 600_000,
  },
  {
    attemptId: "youtube-large-002",
    scenarioId: "youtube-large",
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=first",
    repetition: 2,
    hardTimeoutMs: 600_000,
  },
];

describe("SoakControllerStore", () => {
  it("tracks attempts from configuration through completion", () => {
    const store = new SoakControllerStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.configure(attempts);
    store.markRunning(attempts[0]!.attemptId);
    store.setExpectedComments(attempts[0]!.attemptId, 1200);
    store.updateObservation(attempts[0]!.attemptId, {
      recordedAt: new Date().toISOString(),
      elapsedMs: 12_300,
      status: { type: "running", progress: 42.4 },
      contentScriptReachable: true,
      loadedDomComments: 800,
    });
    store.markCompleted(successfulResult(attempts[0]!));

    expect(store.getSnapshot().attempts[0]).toMatchObject({
      phase: "completed",
      expectedComments: 1200,
      result: { scrapedComments: 1205 },
    });
    expect(listener).toHaveBeenCalled();
  });

  it("marks current and pending attempts when a run aborts", () => {
    const store = new SoakControllerStore();
    store.configure(attempts);
    store.markRunning(attempts[0]!.attemptId);
    store.markAborted("Authentication lost");

    expect(store.getSnapshot()).toMatchObject({
      runStatus: "aborted",
      runError: "Authentication lost",
      attempts: [
        { phase: "aborted", error: "Authentication lost" },
        { phase: "not-run" },
      ],
    });
  });
});

function successfulResult(
  attempt: SoakControllerAttempt,
): SoakControllerResult {
  return {
    attempt,
    status: "success",
    startedAt: new Date().toISOString(),
    durationMs: 15_000,
    expectedComments: 1200,
    scrapedComments: 1205,
    topLevelComments: 1000,
    replyComments: 205,
  };
}
