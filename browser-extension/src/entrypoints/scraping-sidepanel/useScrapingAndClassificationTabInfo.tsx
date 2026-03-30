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
 * String enum for ScrapingAndClassificationTabInfo type values
 */
export enum ScrapingAndClassificationTabInfoType {
  NO_TAB = "no-tab",
  NOT_SCRAPABLE = "not-scrapable",
  SCRAPING_NOT_STARTED = "scraping-not-started",
  SCRAPING_IN_PROGRESS = "scraping-in-progress",
  SCRAPING_CANCELED = "scraping-canceled",
  SCRAPING_FAILED = "scraping-failed",
  CLASSIFICATION_IN_PROGRESS = "classification-in-progress",
  CLASSIFICATION_SUCCEEDED = "classification-succeeded",
  CLASSIFICATION_FAILED = "classification-failed",
}

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
        void queryClient.invalidateQueries({
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
  type: ScrapingAndClassificationTabInfoType.NO_TAB;
};

export type TabInfoNotScrapableTab = {
  type: ScrapingAndClassificationTabInfoType.NOT_SCRAPABLE;
  tabId: number;
};

export type TabInfoScrapingNotStarted = {
  type: ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED;
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingNotStarted;
};

export type TabInfoScrapingInProgress = {
  type: ScrapingAndClassificationTabInfoType.SCRAPING_IN_PROGRESS;
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingRunning | ScrapingCanceling;
};

export type TabInfoScrapingCanceled = {
  type: ScrapingAndClassificationTabInfoType.SCRAPING_CANCELED;
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingCanceled;
};

export type TabInfoScrapingFailed = {
  type: ScrapingAndClassificationTabInfoType.SCRAPING_FAILED;
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingFailed;
};

export type TabInfoClassificationInProgess = {
  type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_IN_PROGRESS;
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingSucceeded;
};

export type TabInfoClassificationSucceeded = {
  type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_SUCCEEDED;
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingSucceeded;
  snapshot: PostSnapshot;
  post: Post;
};

export type TabInfoClassificationFailed = {
  type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_FAILED;
  tabId: number;
  pageInfo: ScrapableSocialNetworkPageInfo;
  scrapingStatus: ScrapingSucceeded;
  snapshot: PostSnapshot;
};

export async function queryScrapingAndClassificationTabInfo(
  tabId: number | undefined,
): Promise<ScrapingAndClassificationTabInfo> {
  if (tabId === undefined) {
    return { type: ScrapingAndClassificationTabInfoType.NO_TAB };
  }
  const client = new ScrapingContentScriptClient(tabId);
  const pageInfo = await client.getTabSocialNetworkPageInfo();

  if (!pageInfo.isScrapablePost) {
    return { type: ScrapingAndClassificationTabInfoType.NOT_SCRAPABLE, tabId };
  }

  const scrapingStatus = await client.getScrapingStatus();
  switch (scrapingStatus.type) {
    case "not-started":
      return {
        type: ScrapingAndClassificationTabInfoType.SCRAPING_NOT_STARTED,
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "running":
    case "canceling":
      return {
        type: ScrapingAndClassificationTabInfoType.SCRAPING_IN_PROGRESS,
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "canceled":
      return {
        type: ScrapingAndClassificationTabInfoType.SCRAPING_CANCELED,
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "failed":
      return {
        type: ScrapingAndClassificationTabInfoType.SCRAPING_FAILED,
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
        type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_IN_PROGRESS,
        tabId,
        pageInfo,
        scrapingStatus,
      };
    case "COMPLETED":
      return {
        type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_SUCCEEDED,
        tabId,
        pageInfo,
        scrapingStatus,
        snapshot,
        post: (await getPostByPostId(snapshot.socialNetwork, snapshot.postId))!,
      };
    case "FAILED":
      return {
        type: ScrapingAndClassificationTabInfoType.CLASSIFICATION_FAILED,
        tabId,
        pageInfo,
        scrapingStatus,
        snapshot,
      };
  }
}
