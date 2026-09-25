import { describe, expect, it } from "vitest";
import { buildProgressReport } from "../buildProgressReport";

describe("buildProgressReport", () => {
  it("writes the server-side equivalent of the attempt table", () => {
    const report = buildProgressReport([
      {
        attempt: {
          attemptId: "youtube-001",
          scenarioId: "youtube",
          platform: "youtube",
          url: "https://www.youtube.com/watch?v=example",
          repetition: 1,
          hardTimeoutMs: 600_000,
        },
        phase: "completed",
        expectedComments: 101,
        observation: {
          recordedAt: new Date().toISOString(),
          elapsedMs: 12_000,
          contentScriptReachable: true,
          loadedDomComments: 123,
          pageVisibilityState: "hidden",
          documentHasFocus: false,
          tabActive: false,
          tabDiscarded: false,
          tabFrozen: true,
          windowFocused: false,
          processUsage: {
            recordedAt: new Date().toISOString(),
            cpuPercent: 12.5,
            jsMemoryUsedBytes: 120 * 1024 * 1024,
            jsMemoryAllocatedBytes: 256 * 1024 * 1024,
          },
        },
        result: {
          attempt: {
            attemptId: "youtube-001",
            scenarioId: "youtube",
            platform: "youtube",
            url: "https://www.youtube.com/watch?v=example",
            repetition: 1,
            hardTimeoutMs: 600_000,
          },
          status: "warning",
          startedAt: new Date().toISOString(),
          durationMs: 12_000,
          scrapedComments: 100,
          topLevelComments: 80,
          replyComments: 20,
          expectedComments: 101,
        },
      },
    ]);

    expect(report).toContain(
      "| Attempt | Status | Expected | Scraped | Duration | Duration per comment | Progress |",
    );
    expect(report).toContain(
      "| youtube-001 | 🟠 warning | 101 | 100 | 12.00 s | 0.12 s | 123 DOM comments<br>CPU 12.5% · JS memory 120.0 MiB / 256.0 MiB |",
    );
    expect(report).not.toContain("page hidden");
    expect(report).not.toContain("| Root | Replies |");
  });

  it("shows an expected count while an attempt is running", () => {
    const report = buildProgressReport([
      {
        attempt: {
          attemptId: "youtube-001",
          scenarioId: "youtube",
          platform: "youtube",
          url: "https://www.youtube.com/watch?v=example",
          repetition: 1,
          hardTimeoutMs: 600_000,
        },
        phase: "running",
        expectedComments: 101,
        observation: {
          recordedAt: new Date().toISOString(),
          elapsedMs: 12_000,
          status: { type: "running", progress: 42.4 },
          contentScriptReachable: true,
          loadedDomComments: 80,
          pageVisibilityState: "visible",
          documentHasFocus: true,
          tabActive: true,
          windowFocused: true,
          processUsage: {
            recordedAt: new Date().toISOString(),
            cpuPercent: 32.5,
            jsMemoryUsedBytes: 80 * 1024 * 1024,
            jsMemoryAllocatedBytes: 128 * 1024 * 1024,
          },
        },
      },
    ]);

    expect(report).toContain(
      "| youtube-001 | ▶️ running | 101 | n/a | 12.00 s... | n/a | 42% / 80 DOM comments<br>CPU 32.5% · JS memory 80.0 MiB / 128.0 MiB<br>page visible · document focused · tab active · window focused |",
    );
    expect(report).not.toContain("window focused / 12.00 s");
  });
});
