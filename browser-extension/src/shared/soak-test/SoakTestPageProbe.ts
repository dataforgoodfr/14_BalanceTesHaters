import type {
  SoakControllerAttempt,
  SoakTestProcessUsage,
} from "./SoakTestProtocol";

type Platform = SoakControllerAttempt["platform"];
const latestProcessUsageByTabId = new Map<number, SoakTestProcessUsage>();

export type PageState = {
  contentReady: boolean;
  authenticated?: boolean;
  pageUrl?: string;
};

export function startProcessMonitoring(): () => void {
  const processes = getProcessesApi();
  if (!processes) return () => undefined;

  const listener: ProcessesUpdatedListener = (updatedProcesses) => {
    const processesByTabId = new Map<number, ChromeProcess[]>();
    for (const process of Object.values(updatedProcesses)) {
      for (const tabId of new Set(
        process.tasks
          .map((task) => task.tabId)
          .filter((value): value is number => value !== undefined),
      )) {
        const tabProcesses = processesByTabId.get(tabId) ?? [];
        tabProcesses.push(process);
        processesByTabId.set(tabId, tabProcesses);
      }
    }

    const recordedAt = new Date().toISOString();
    for (const [tabId, tabProcesses] of processesByTabId) {
      const cpuPercent = sumDefined(tabProcesses.map((process) => process.cpu));
      const jsMemoryUsedBytes = sumDefined(
        tabProcesses.map((process) => process.jsMemoryUsed),
      );
      const jsMemoryAllocatedBytes = sumDefined(
        tabProcesses.map((process) => process.jsMemoryAllocated),
      );
      latestProcessUsageByTabId.set(tabId, {
        recordedAt,
        ...(cpuPercent === undefined ? {} : { cpuPercent }),
        ...(jsMemoryUsedBytes === undefined ? {} : { jsMemoryUsedBytes }),
        ...(jsMemoryAllocatedBytes === undefined
          ? {}
          : { jsMemoryAllocatedBytes }),
      });
    }
  };

  processes.onUpdated.addListener(listener);
  return () => processes.onUpdated.removeListener(listener);
}

export function forgetProcessUsage(tabId: number): void {
  latestProcessUsageByTabId.delete(tabId);
}

export async function inspectPage(
  tabId: number,
  platform: Platform,
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
        return {
          contentReady: document.querySelector("video") !== null,
          pageUrl: location.href,
          authenticated: youtubeConfig?.get("LOGGED_IN") === true,
        };
      }

      const loginLinks = Array.from(document.querySelectorAll("a")).filter(
        (element) =>
          /^(Log In|Se connecter)$/i.test(element.textContent?.trim() ?? ""),
      );
      const contentReady =
        document.querySelector("video") !== null ||
        Array.from(document.querySelectorAll("img")).some((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.height > 200 && bounds.width > 200;
        });
      return {
        contentReady,
        pageUrl: location.href,
        authenticated: loginLinks.length === 0,
      };
    },
  });
  return results[0]?.result ?? { contentReady: false };
}

export async function readExpectedCommentCount(
  tabId: number,
  platform: Platform,
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

export async function readActivity(
  tabId: number,
  platform: Platform,
): Promise<PageActivity> {
  let pageActivity: Pick<
    PageActivity,
    "loadedDomComments" | "pageUrl" | "pageVisibilityState" | "documentHasFocus"
  > = {};
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: (targetPlatform: Platform) => {
        const selector =
          targetPlatform === "youtube"
            ? "#comment-container"
            : "svg[aria-label='Like']";
        const loadedDomComments = [
          ...document.querySelectorAll<HTMLElement>(selector),
        ].filter((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.height !== 0 && bounds.width !== 0;
        }).length;
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
    // Tab lifecycle data can still explain why injection failed.
  }

  let tabActivity: Pick<
    PageActivity,
    | "tabActive"
    | "tabDiscarded"
    | "tabFrozen"
    | "tabLastAccessed"
    | "windowFocused"
  > = {};
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
    // Missing values remain undefined.
  }

  return {
    ...pageActivity,
    ...tabActivity,
    processUsage: latestProcessUsageByTabId.get(tabId),
  };
}

type PageActivity = {
  loadedDomComments?: number;
  pageUrl?: string;
  pageVisibilityState?: "visible" | "hidden";
  documentHasFocus?: boolean;
  tabActive?: boolean;
  tabDiscarded?: boolean;
  tabFrozen?: boolean;
  tabLastAccessed?: number;
  windowFocused?: boolean;
  processUsage?: SoakTestProcessUsage;
};

type ChromeProcessTask = {
  tabId?: number;
};

type ChromeProcess = {
  cpu?: number;
  jsMemoryUsed?: number;
  jsMemoryAllocated?: number;
  tasks: ChromeProcessTask[];
};

type ProcessesUpdatedListener = (
  processes: Record<number, ChromeProcess>,
) => void;

type ChromeProcessesApi = {
  onUpdated: {
    addListener: (listener: ProcessesUpdatedListener) => void;
    removeListener: (listener: ProcessesUpdatedListener) => void;
  };
};

function getProcessesApi(): ChromeProcessesApi | undefined {
  return (
    globalThis as typeof globalThis & {
      chrome?: { processes?: ChromeProcessesApi };
    }
  ).chrome?.processes;
}

function sumDefined(values: (number | undefined)[]): number | undefined {
  const definedValues = values.filter(
    (value): value is number => value !== undefined,
  );
  return definedValues.length === 0
    ? undefined
    : definedValues.reduce((total, value) => total + value, 0);
}
