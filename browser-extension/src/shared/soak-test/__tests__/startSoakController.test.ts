import { afterEach, expect, it, vi } from "vitest";
import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import { getPostSnapshotById } from "@/shared/storage/post-snapshot-storage";
import { snapshot } from "@/shared/storage/post-snapshot-storage/__tests__/post-snapshot-storage.fixtures";
import { startSoakController } from "../startSoakController";
import type { SoakControllerResult } from "../SoakTestProtocol";

vi.mock("@/shared/scraping-content-script/ScrapingContentScriptClient", () => ({
  CONTENT_SCRIPT_LOADING: "loading",
  ScrapingContentScriptClient: vi.fn(),
}));
vi.mock("@/shared/storage/post-snapshot-storage", () => ({
  getPostSnapshotById: vi.fn(),
  deleteAllPostSnapshots: vi.fn(),
}));
vi.mock("@/shared/storage/settings-storage", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setSettings: vi.fn(),
}));
vi.mock("../SoakTestPageProbe", () => ({
  startProcessMonitoring: vi.fn(),
  forgetProcessUsage: vi.fn(),
  inspectPage: () =>
    Promise.resolve({ contentReady: true, authenticated: true }),
  readActivity: () => Promise.resolve({}),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([
  { running: true, expected: 2, status: "success" },
  { running: true, expected: 0, status: "warning" },
  { running: false, expected: 2, status: "success" },
  { running: true, expected: undefined, status: "success" },
])(
  "uses snapshot count $expected after running=$running",
  async ({ running, expected, status }) => {
    vi.useFakeTimers();
    const postSnapshot = snapshot();
    if (expected !== undefined) {
      postSnapshot.scrapingMetadata = {
        expectedCommentsCount: expected,
        commentsLimit: 4000,
        limitReached: false,
        filteredCommentsCount: 0,
        durationMs: 1000,
        screenshotsEnabled: true,
      };
    }
    vi.mocked(getPostSnapshotById).mockResolvedValue(postSnapshot);
    const getScrapingStatus = vi.fn().mockResolvedValue({
      type: "succeeded",
      postSnapshotId: postSnapshot.id,
      durationMs: 1000,
    });
    if (running)
      getScrapingStatus.mockResolvedValueOnce({
        type: "running",
        progress: 50,
        scrapingStartDate: new Date().toISOString(),
        expectedCommentCount: 0,
      });
    vi.mocked(ScrapingContentScriptClient).mockImplementation(function () {
      return {
        getTabSocialNetworkPageInfo: () =>
          Promise.resolve({ isScrapablePost: true }),
        startScraping: () => Promise.resolve({ type: "started" }),
        getScrapingStatus,
      } as unknown as ScrapingContentScriptClient;
    });
    vi.stubGlobal("browser", {
      runtime: { onMessage: { addListener: vi.fn() } },
      tabs: { create: () => Promise.resolve({ id: 42 }), remove: vi.fn() },
    });
    let result: SoakControllerResult | undefined;
    const events: { status?: { expectedCommentCount?: number } }[] = [];
    let completed = false;
    vi.stubGlobal("fetch", (url: string, options?: RequestInit) => {
      const action = url.split("/").at(-1);
      const payload: unknown =
        typeof options?.body === "string"
          ? JSON.parse(options.body)
          : undefined;
      if (action === "result") result = payload as SoakControllerResult;
      if (action === "event")
        events.push(
          (payload as { observation: (typeof events)[number] }).observation,
        );
      if (action === "complete") completed = true;
      return Promise.resolve(
        new Response(
          JSON.stringify(
            action === "config"
              ? {
                  attempts: [
                    {
                      attemptId: "youtube-001",
                      scenarioId: "youtube",
                      platform: "youtube",
                      url: postSnapshot.url,
                      repetition: 1,
                      hardTimeoutMs: 60_000,
                    },
                  ],
                  stallTimeoutMs: 30_000,
                  pollIntervalMs: 100,
                  postSnapshotCleanup: "keep",
                  scrapingSettings: {
                    skipScreenshoting: true,
                    skipSubmitForClassification: true,
                  },
                }
              : { ok: true },
          ),
        ),
      );
    });
    startSoakController();
    await vi.runAllTimersAsync();
    expect(completed).toBe(true);
    expect(result).toMatchObject({
      scrapedComments: 2,
      status,
    });
    expect(result?.expectedComments).toBe(expected);
    if (running) expect(events[0]?.status?.expectedCommentCount).toBe(0);
  },
);
