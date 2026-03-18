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
import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";

/**
 * Returns scraping and classification info about the "current tab".
 * Automatically refreshes at interval and when current tab or tab url changed
 * @returns
 */
export function useScrapingAndClassificationTabInfo(
  tabId: number | undefined,
): UseQueryResult<ScrapingAndClassificationTabInfo> {
  const queryResult = useQuery({
    queryKey: scrapingAndClassificationTabInfoQueryKey(tabId),
    queryFn: () => queryScrapingAndClassificationTabInfo(tabId),
    refetchInterval: 2000,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const listener = (
      changedTabId: number,
      changeInfo: Browser.tabs.OnUpdatedInfo,
    ) => {
      if (changedTabId === tabId && changeInfo.url) {
        // Trigger query on tab url change to keep side panel content
        queryClient.invalidateQueries({
          queryKey: scrapingAndClassificationTabInfoQueryKey(tabId),
        });
      }
    };
    browser.tabs.onUpdated.addListener(listener);
    return () => {
      browser.tabs.onUpdated.removeListener(listener);
    };
  }, [tabId]);
  return queryResult;
}

export function scrapingAndClassificationTabInfoQueryKey(
  tabId: number | undefined,
) {
  return ["scrapingAndClassificationTabInfo", tabId];
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

export async function queryScrapingAndClassificationTabInfo(
  tabId: number | undefined,
): Promise<ScrapingAndClassificationTabInfo> {
  if (tabId === undefined) {
    return { type: "no-tab" };
  }
  const client = new ScrapingContentScriptClient(tabId);
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
