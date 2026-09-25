import {
  CONTENT_SCRIPT_LOADING,
  ScrapingContentScriptClient,
} from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import type { ScrapingStatus } from "@/shared/scraping-content-script/ScrapingStatus";
import { refineSuccessStatus } from "./SoakTestMetrics";
import { isSoakTestScraperLogMessage } from "./SoakTestScraperLogCapture";
import { countAllComments } from "@/shared/model/PostSnapshot";
import {
  deleteAllPostSnapshots,
  getPostSnapshotById,
} from "@/shared/storage/post-snapshot-storage";
import type {
  SoakControllerAttempt,
  SoakControllerConfig,
  SoakControllerObservation,
  SoakControllerResult,
} from "./SoakTestProtocol";
import {
  SOAK_TEST_CONTROLLER_URL,
  SoakControllerAcknowledgementSchema,
  SoakControllerConfigSchema,
} from "./SoakTestProtocol";
import { soakControllerStore } from "./SoakControllerStore";
import type { ZodType } from "zod";

const controllerUrl = SOAK_TEST_CONTROLLER_URL;
const attemptIdsByTabId = new Map<number, string>();
let scraperLogWriteQueue = Promise.resolve();

export function startSoakController(): void {
  browser.runtime.onMessage.addListener(captureScraperLog);
  void run().catch(async (error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    soakControllerStore.markAborted(message);
    await post("fatal", {
      error: message,
    }).catch(() => undefined);
  });
}

async function run(): Promise<void> {
  const config = await waitForConfig();
  soakControllerStore.configure(config.attempts);
  if (config.postSnapshotCleanup === "on-start") {
    await deleteAllPostSnapshots();
  }
  await post("ready", {});
  for (const attempt of config.attempts) {
    soakControllerStore.setRunStatus("running");
    soakControllerStore.markRunning(attempt.attemptId);
    await post("attempt-started", { attempt });
    const result = await runAttempt(attempt, config, {
      onExpectedComments: async (expected) => {
        soakControllerStore.setExpectedComments(attempt.attemptId, expected);
        await post("expected-comments", {
          attemptId: attempt.attemptId,
          expectedComments: expected,
        });
      },
      onObservation: (observation) =>
        soakControllerStore.updateObservation(attempt.attemptId, observation),
    });
    soakControllerStore.markCompleted(result);
    await post("result", result);
  }
  soakControllerStore.setRunStatus("completed");
  await post("complete", {});
}

async function waitForConfig(): Promise<SoakControllerConfig> {
  for (;;) {
    try {
      return await request("config", SoakControllerConfigSchema);
    } catch {
      soakControllerStore.setRunStatus("waiting-for-server");
      await sleep(1000);
    }
  }
}

async function runAttempt(
  attempt: SoakControllerAttempt,
  config: SoakControllerConfig,
  updates: AttemptUpdates,
): Promise<SoakControllerResult> {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  let tabId: number | undefined;
  let expectedComments: number | undefined;
  const captureExpectedComments = async (): Promise<void> => {
    if (tabId === undefined || expectedComments !== undefined) return;
    const value = await readExpectedCommentCount(tabId, attempt.platform).catch(
      () => undefined,
    );
    if (value === undefined) return;
    expectedComments = value;
    await updates.onExpectedComments(value);
  };
  try {
    if (config.postSnapshotCleanup === "before-each-attempt") {
      await deleteAllPostSnapshots();
    }
    const tab = await browser.tabs.create({ url: attempt.url, active: true });
    tabId = tab.id;
    if (tabId === undefined) {
      throw new Error("Chromium did not return an id for the post tab.");
    }
    attemptIdsByTabId.set(tabId, attempt.attemptId);
    const client = new ScrapingContentScriptClient(tabId);
    await waitForPage(client, tabId, attempt.platform);
    const authentication = await waitForAuthentication(tabId, attempt.platform);
    if (!authentication.authenticated) {
      throw new AuthenticationError(
        `The browser profile is not authenticated on ${attempt.platform}. Last page state: ${JSON.stringify(authentication.lastState)}`,
      );
    }
    await captureExpectedComments();
    const startResult = await client.startScraping();
    if (startResult.type === "failed") {
      throw new Error(startResult.errorMessage);
    }
    const observed = await observe(
      tabId,
      client,
      attempt.attemptId,
      attempt.platform,
      attempt.hardTimeoutMs,
      config,
      updates.onObservation,
      captureExpectedComments,
    );
    if (
      observed.status === "stalled" ||
      observed.status === "hard_timeout" ||
      observed.status === "content_script_lost"
    ) {
      await client.cancelScraping().catch(() => undefined);
    }
    const status =
      observed.status === "success"
        ? refineSuccessStatus(expectedComments, observed.scrapedComments)
        : observed.status;
    return {
      attempt,
      ...observed,
      status,
      expectedComments,
      startedAt,
      durationMs: Date.now() - startedAtMs,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    const failureActivity =
      tabId === undefined ? {} : await readActivity(tabId, attempt.platform);
    const pageState = failureActivity.pageUrl
      ? `\nPage at failure: ${failureActivity.pageUrl}\nExpected page: ${attempt.url}\nNavigated away: ${failureActivity.pageUrl !== attempt.url ? "yes" : "no"}`
      : "\nPage at failure: unavailable";
    return {
      attempt,
      status: "harness_error",
      startedAt,
      durationMs: Date.now() - startedAtMs,
      expectedComments,
      lastObservation:
        tabId === undefined
          ? undefined
          : {
              recordedAt: new Date().toISOString(),
              elapsedMs: Date.now() - startedAtMs,
              contentScriptReachable: false,
              ...failureActivity,
            },
      harnessError: `${error instanceof Error ? error.stack : String(error)}${pageState}`,
    };
  } finally {
    if (tabId !== undefined) {
      await scraperLogWriteQueue;
      attemptIdsByTabId.delete(tabId);
      await browser.tabs.remove(tabId).catch(() => undefined);
    }
  }
}

async function waitForPage(
  client: ScrapingContentScriptClient,
  tabId: number,
  platform: SoakControllerAttempt["platform"],
): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const pageInfo = await client.getTabSocialNetworkPageInfo();
    const state = await inspectPage(tabId, platform);
    console.debug("waitForPage - pageInfo: ", pageInfo, "pageState:", state);
    if (
      pageInfo !== CONTENT_SCRIPT_LOADING &&
      pageInfo.isScrapablePost &&
      state.contentReady
    ) {
      return;
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for the post page and content script.");
}

async function waitForAuthentication(
  tabId: number,
  platform: SoakControllerAttempt["platform"],
): Promise<{ authenticated: boolean; lastState: PageState }> {
  const deadline = Date.now() + 15_000;
  let authenticatedSamples = 0;
  let unauthenticatedSamples = 0;
  let lastState: PageState = { contentReady: false };
  while (Date.now() < deadline) {
    const state = await inspectPage(tabId, platform);
    lastState = state;
    if (state.authenticated === true) {
      authenticatedSamples += 1;
      unauthenticatedSamples = 0;
    } else if (state.authenticated === false) {
      unauthenticatedSamples += 1;
      authenticatedSamples = 0;
    } else {
      authenticatedSamples = 0;
      unauthenticatedSamples = 0;
    }
    if (authenticatedSamples >= 4) {
      return { authenticated: true, lastState };
    }
    if (unauthenticatedSamples >= 10) {
      return { authenticated: false, lastState };
    }
    await sleep(500);
  }
  return { authenticated: false, lastState };
}

async function observe(
  tabId: number,
  client: ScrapingContentScriptClient,
  attemptId: string,
  platform: SoakControllerAttempt["platform"],
  hardTimeoutMs: number,
  config: SoakControllerConfig,
  onObservation: (observation: SoakControllerObservation) => void,
  captureExpectedComments: () => Promise<void>,
): Promise<
  Pick<
    SoakControllerResult,
    | "status"
    | "lastObservation"
    | "scraperError"
    | "scrapedComments"
    | "topLevelComments"
    | "replyComments"
  >
> {
  const startedAt = Date.now();
  let lastMovementAt = startedAt;
  let lastSignature: string | undefined;
  let lastObservation: SoakControllerObservation | undefined;
  let unreachableSince: number | undefined;
  for (;;) {
    await captureExpectedComments();
    const now = Date.now();
    const scrapingStatus = await readStatus(client);
    const activity = await readActivity(tabId, platform);
    const observation: SoakControllerObservation = {
      recordedAt: new Date(now).toISOString(),
      elapsedMs: now - startedAt,
      status: scrapingStatus,
      contentScriptReachable: scrapingStatus !== undefined,
      ...activity,
    };
    lastObservation = observation;
    onObservation(observation);
    await post("event", { attemptId, observation });
    if (scrapingStatus?.type === "succeeded") {
      const postSnapshot = await getPostSnapshotById(
        scrapingStatus.postSnapshotId,
      );
      if (!postSnapshot) return { status: "harness_error", lastObservation };
      await post("scraped-post", { attemptId, postSnapshot });
      const scrapedComments = countAllComments(postSnapshot.comments);
      return {
        status: "success",
        lastObservation,
        scrapedComments,
        topLevelComments: postSnapshot.comments.length,
        replyComments: scrapedComments - postSnapshot.comments.length,
      };
    }
    if (scrapingStatus?.type === "failed") {
      return {
        status: "scraper_error",
        lastObservation,
        scraperError: scrapingStatus.errorMessage,
      };
    }
    if (scrapingStatus?.type === "canceled") {
      return { status: "scraper_error", lastObservation };
    }
    if (scrapingStatus === undefined) unreachableSince ??= now;
    else unreachableSince = undefined;
    const signature = JSON.stringify({ status: scrapingStatus, ...activity });
    if (signature !== lastSignature) {
      lastSignature = signature;
      lastMovementAt = now;
    }
    if (
      unreachableSince !== undefined &&
      now - unreachableSince >= config.stallTimeoutMs
    ) {
      return { status: "content_script_lost", lastObservation };
    }
    if (now - startedAt >= hardTimeoutMs) {
      return { status: "hard_timeout", lastObservation };
    }
    if (now - lastMovementAt >= config.stallTimeoutMs) {
      return { status: "stalled", lastObservation };
    }
    await sleep(config.pollIntervalMs);
  }
}

async function readStatus(
  client: ScrapingContentScriptClient,
): Promise<ScrapingStatus | undefined> {
  try {
    return await client.getScrapingStatus();
  } catch {
    return undefined;
  }
}

async function inspectPage(
  tabId: number,
  platform: SoakControllerAttempt["platform"],
): Promise<PageState> {
  const results = await browser.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [platform],
    func: (targetPlatform) => {
      if (targetPlatform === "youtube") {
        const youtubeConfig = (
          window as typeof window & {
            ytcfg?: { get: (name: string) => unknown };
          }
        ).ytcfg;
        const loggedIn = youtubeConfig?.get("LOGGED_IN") === true;
        return {
          contentReady: document.querySelector("video") !== null,
          pageUrl: location.href,
          authenticated: loggedIn,
        };
      } else if (targetPlatform === "instagram") {
        const loginLinks = Array.from(document.querySelectorAll("a")).filter(
          (element) =>
            /^(Log In|Se connecter)$/i.test(element.textContent?.trim() ?? ""),
        );
        const ready =
          document.querySelector("video") !== null ||
          Array.from(document.querySelectorAll("img")).filter(
            (e) =>
              e.getBoundingClientRect().height > 200 &&
              e.getBoundingClientRect().width > 200,
          ).length > 0;
        return {
          contentReady: ready,
          pageUrl: location.href,
          authenticated: loginLinks.length === 0,
        };
      } else {
        throw new Error("Unsupported platform: " + platform);
      }
    },
  });
  return results[0]?.result ?? { contentReady: false };
}

async function readExpectedCommentCount(
  tabId: number,
  platform: SoakControllerAttempt["platform"],
): Promise<number | undefined> {
  const results = await browser.scripting.executeScript({
    target: { tabId },
    args: [platform],
    func: (targetPlatform) => {
      const text =
        targetPlatform === "youtube"
          ? document.querySelector("#comments #count span:nth-of-type(1)")
              ?.textContent
          : document
              .querySelector("meta[property='og:description']")
              ?.getAttribute("content")
              ?.match(/([0-9][0-9, .]*)\s+comments\b/i)?.[1];
      if (!text) return undefined;
      const digits = text.replace(/[^0-9]/g, "");
      const value = Number(digits);
      return digits && Number.isSafeInteger(value) ? value : undefined;
    },
  });
  const count = results[0]?.result;
  return typeof count === "number" && count >= 0 && Number.isSafeInteger(count)
    ? count
    : undefined;
}

async function readActivity(
  tabId: number,
  platform: SoakControllerAttempt["platform"],
): Promise<{
  loadedDomComments?: number;
  pageUrl?: string;
  pageVisibilityState?: "visible" | "hidden";
  documentHasFocus?: boolean;
  tabActive?: boolean;
  tabDiscarded?: boolean;
  tabFrozen?: boolean;
  tabLastAccessed?: number;
  windowFocused?: boolean;
}> {
  let pageActivity: {
    loadedDomComments?: number;
    pageUrl?: string;
    pageVisibilityState?: "visible" | "hidden";
    documentHasFocus?: boolean;
  } = {};
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: (platform: SoakControllerAttempt["platform"]) => {
        const countVisibleElements = (selector: string): number =>
          [...document.querySelectorAll<HTMLElement>(selector)].filter(
            (element) => {
              const boundingRect = element.getBoundingClientRect();
              return boundingRect.height !== 0 && boundingRect.width !== 0;
            },
          ).length;
        const commentSelector =
          platform === "youtube"
            ? "#comment-container"
            : // For instagram count like buttons as an approximation for comments cound
              "svg[aria-label='Like']";
        const loadedDomComments = countVisibleElements(commentSelector);
        return {
          loadedDomComments,
          pageUrl: location.href,
          pageVisibilityState: document.visibilityState,
          documentHasFocus: document.hasFocus(),
        };
      },
      args: [platform],
    });
    pageActivity = results[0]?.result ?? {};
  } catch {
    // The tab lifecycle data below can still explain why injection failed.
  }

  let tabActivity: {
    tabActive?: boolean;
    tabDiscarded?: boolean;
    tabFrozen?: boolean;
    tabLastAccessed?: number;
    windowFocused?: boolean;
  } = {};
  try {
    const tab = await browser.tabs.get(tabId);
    const lifecycleTab = tab as typeof tab & {
      frozen?: boolean;
      lastAccessed?: number;
    };
    const window = await browser.windows.get(tab.windowId);
    tabActivity = {
      tabActive: tab.active,
      tabDiscarded: tab.discarded,
      tabFrozen: lifecycleTab.frozen,
      tabLastAccessed: lifecycleTab.lastAccessed,
      windowFocused: window.focused,
    };
  } catch {
    // Missing values are represented as undefined in the observation.
  }

  return { ...pageActivity, ...tabActivity };
}

async function request<T>(path: string, schema: ZodType<T>): Promise<T> {
  const response = await fetch(`${controllerUrl}/${path}`);
  if (!response.ok)
    throw new Error(`Controller ${path} returned ${response.status}.`);
  return schema.parse(await response.json());
}

async function post(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${controllerUrl}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`Controller ${path} returned ${response.status}.`);
  SoakControllerAcknowledgementSchema.parse(await response.json());
}

function captureScraperLog(
  message: unknown,
  sender: Browser.runtime.MessageSender,
): void {
  if (!isSoakTestScraperLogMessage(message) || sender.tab?.id === undefined)
    return;
  const attemptId = attemptIdsByTabId.get(sender.tab.id);
  if (!attemptId) return;
  scraperLogWriteQueue = scraperLogWriteQueue
    .then(() =>
      post("scraper-log", {
        attemptId,
        entry: message.entry,
      }),
    )
    .catch((error: unknown) => {
      console.error("Failed to persist a scraper log.", error);
    });
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

class AuthenticationError extends Error {}

type AttemptUpdates = {
  onExpectedComments: (expected: number) => Promise<void>;
  onObservation: (observation: SoakControllerObservation) => void;
};

type PageState = {
  contentReady: boolean;
  authenticated?: boolean;
  pageUrl?: string;
};
