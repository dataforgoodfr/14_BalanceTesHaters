import { describe, expect, it } from "vitest";
import {
  SoakControllerConfigSchema,
  SoakControllerExpectedCommentsEventSchema,
  SoakControllerObservationEventSchema,
  SoakControllerResultSchema,
  SoakControllerScraperLogSchema,
} from "../../../shared/soak-test/SoakTestProtocol";

const attempt = {
  attemptId: "youtube-large-001",
  scenarioId: "youtube-large",
  platform: "youtube",
  url: "https://www.youtube.com/watch?v=example",
  repetition: 1,
  hardTimeoutMs: 600_000,
} as const;

describe("SoakTestProtocol", () => {
  it("parses a valid controller configuration", () => {
    expect(
      SoakControllerConfigSchema.parse({
        attempts: [attempt],
        stallTimeoutMs: 90_000,
        pollIntervalMs: 1000,
        postSnapshotCleanup: "keep",
      }),
    ).toEqual({
      attempts: [attempt],
      stallTimeoutMs: 90_000,
      pollIntervalMs: 1000,
      postSnapshotCleanup: "keep",
    });
  });

  it("rejects an unknown post-snapshot cleanup mode", () => {
    expect(() =>
      SoakControllerConfigSchema.parse({
        attempts: [attempt],
        stallTimeoutMs: 90_000,
        pollIntervalMs: 1000,
        postSnapshotCleanup: "sometimes",
      }),
    ).toThrow();
  });

  it("rejects malformed nested observations", () => {
    expect(() =>
      SoakControllerObservationEventSchema.parse({
        attemptId: attempt.attemptId,
        observation: {
          recordedAt: new Date().toISOString(),
          elapsedMs: 1000,
          contentScriptReachable: true,
          status: { type: "running", progress: 101 },
        },
      }),
    ).toThrow();
  });

  it("parses page and tab lifecycle observations", () => {
    const parsed = SoakControllerObservationEventSchema.parse({
      attemptId: attempt.attemptId,
      observation: {
        recordedAt: new Date().toISOString(),
        elapsedMs: 1000,
        contentScriptReachable: true,
        pageVisibilityState: "hidden",
        documentHasFocus: false,
        tabActive: false,
        tabDiscarded: false,
        tabFrozen: true,
        tabLastAccessed: 123_456,
        windowFocused: false,
      },
    });

    expect(parsed.observation).toMatchObject({
      pageVisibilityState: "hidden",
      tabActive: false,
      tabFrozen: true,
      windowFocused: false,
    });
  });

  it("rejects malformed scraper log messages", () => {
    expect(() =>
      SoakControllerScraperLogSchema.parse({
        attemptId: attempt.attemptId,
        entry: {
          recordedAt: "not-a-date",
          level: "verbose",
          message: "Loading comments",
        },
      }),
    ).toThrow();
  });

  it("allows unavailable expected comment counts to be omitted", () => {
    expect(
      SoakControllerResultSchema.parse({
        attempt,
        status: "success",
        startedAt: new Date().toISOString(),
        durationMs: 1000,
        scrapedComments: 12,
      }),
    ).not.toHaveProperty("expectedComments");
  });

  it("accepts a warning status for a completed scrape", () => {
    expect(
      SoakControllerResultSchema.parse({
        attempt,
        status: "warning",
        startedAt: new Date().toISOString(),
        durationMs: 1000,
        expectedComments: 12,
        scrapedComments: 11,
      }),
    ).toMatchObject({ status: "warning" });
  });

  it("rejects null expected comment counts", () => {
    expect(() =>
      SoakControllerResultSchema.parse({
        attempt,
        status: "success",
        startedAt: new Date().toISOString(),
        durationMs: 1000,
        expectedComments: null,
      }),
    ).toThrow();
  });

  it("parses an expected comment count event", () => {
    expect(
      SoakControllerExpectedCommentsEventSchema.parse({
        attemptId: attempt.attemptId,
        expectedComments: 1200,
      }),
    ).toEqual({
      attemptId: attempt.attemptId,
      expectedComments: 1200,
    });
  });
});
