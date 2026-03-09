import { Post } from "@/shared/model/post/Post";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { ScrapingContentScriptClient } from "@/shared/scraping-content-script/ScrapingContentScriptClient";
import {
  ScrapingCanceled,
  ScrapingCanceling,
  ScrapingFailed,
  ScrapingNotStarted,
  ScrapingRunning,
  ScrapingSucceeded,
} from "@/shared/scraping-content-script/ScrapingStatus";
import { ScrapableSocialNetworkPage as ScrapableSocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { getPostSnapshotById } from "@/shared/storage/post-snapshot-storage";
import { getPostByPostId } from "@/shared/storage/post-storage";
import { getCurrentTab } from "@/shared/utils/getCurrentTab";
import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";

export const scrapingAndClassificaitonTabInfoQueryKey = [
  "scrapingAndClassificationTabInfo",
];

/**
 * Returns scraping and classification info about the "current tab".
 * Automatically refreshes at interval and when current tab or tab url changed
 * @returns
 */
export function useScrapingAndClassificationTabInfo(): UseQueryResult<ScrapingAndClassificationTabInfo> {
  const queryResult = useQuery({
    queryKey: scrapingAndClassificaitonTabInfoQueryKey,
    queryFn: queryScrapingAndClassificationTabInfo,
    refetchInterval: 2000,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate query on tab changes to keep side panel content
    // in sync with new current tab
    const invalidate = () => {
      queryClient.invalidateQueries({
        queryKey: scrapingAndClassificaitonTabInfoQueryKey,
      });
    };
    browser.tabs.onActivated.addListener(invalidate);
    browser.tabs.onUpdated.addListener(invalidate);
    return () => {
      browser.tabs.onActivated.removeListener(invalidate);
      browser.tabs.onUpdated.removeListener(invalidate);
    };
  });
  return queryResult;
}

export type ScrapingAndClassificationTabInfo =
  | NoTabInfo
  | TabInfoNotScrapableTab
  | TabInfoScrapingNotStarted
  | TabInfoScrapingInProgress
  | TabInfoScrapingFailed
  | TabInfoScrapingCanceled
  | TabInfoClassificationInProgess
  | TabInfoClassificationSucceeded
  | TabInfoClassificationFailed;

export type NoTabInfo = {
  type: "no-tab";
};

export type TabInfoNotScrapableTab = {
  type: "not-scrapable";
  tabId: number;
};

export type TabInfoScrapingNotStarted = {
  type: "scraping-not-started";
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingNotStarted;
};

export type TabInfoScrapingInProgress = {
  type: "scraping-in-progress";
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingRunning | ScrapingCanceling;
};

export type TabInfoScrapingCanceled = {
  type: "scraping-canceled";
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingCanceled;
};

export type TabInfoScrapingFailed = {
  type: "scraping-failed";
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingFailed;
};

export type TabInfoClassificationInProgess = {
  type: "classification-in-progress";
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingSucceeded;
};

export type TabInfoClassificationSucceeded = {
  type: "classification-succeeded";
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingSucceeded;
  snapshot: PostSnapshot;
  post: Post;
};

export type TabInfoClassificationFailed = {
  type: "classification-failed";
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingSucceeded;
  snapshot: PostSnapshot;
};

async function getTabWithUrl(tabUrl: string) {
  console.log("Querying to tab with url " + tabUrl);
  const queryOptions = { url: tabUrl };
  const tabs = await browser.tabs.query(queryOptions);
  if (tabs.length === 0) {
    throw new Error("Couldn't find a tab with url: " + tabUrl);
  }
  return tabs[0];
}

export async function queryScrapingAndClassificationTabInfo(): Promise<ScrapingAndClassificationTabInfo> {
  const parsedUrl = URL.parse(document.URL);
  const tabUrl = parsedUrl?.hash?.substring(1);
  const tab = tabUrl ? await getTabWithUrl(tabUrl) : await getCurrentTab();
  if (tab?.id === undefined) {
    return { type: "no-tab" };
  }
  const tabId = tab.id;

  const client = new ScrapingContentScriptClient(tab.id);
  const pageInfo = await client.getTabSocialNetworkPageInfo();

  if (!pageInfo.isScrapablePost) {
    return { type: "not-scrapable", tabId };
  }

  const scrapingStatus = await client.getScrapingStatus();
  switch (scrapingStatus.type) {
    case "not-started":
      return {
        type: "scraping-not-started",
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "running":
    case "canceling":
      return {
        type: "scraping-in-progress",
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "canceled":
      return {
        type: "scraping-canceled",
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "failed":
      return {
        type: "scraping-failed",
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "succeeded":
      return await buildClassificationStatus(tabId, pageInfo, scrapingStatus);
  }
}

export async function buildClassificationStatus(
  tabId: number,
  pageInfo: ScrapableSocialNetworkPageInfo,
  scrapingStatus: ScrapingSucceeded,
): Promise<
  | TabInfoClassificationInProgess
  | TabInfoClassificationSucceeded
  | TabInfoClassificationFailed
> {
  const snapshot = await getPostSnapshotById(scrapingStatus.postSnapshotId);

  switch (snapshot?.classificationStatus) {
    // Given that submission is supposed to be automatic surface only in progess to end user
    case undefined:
    case "SUBMITTED":
    case "IN_PROGRESS":
      return {
        type: "classification-in-progress",
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "COMPLETED":
      return {
        type: "classification-succeeded",
        tabId,
        pageInfo,
        scrapingStatus,
        snapshot,
        post: (await getPostByPostId(snapshot.socialNetwork, snapshot.postId))!,
      };
    case "FAILED":
      return {
        type: "classification-failed",
        tabId,
        pageInfo,
        scrapingStatus,
        snapshot,
      };
  }
}
