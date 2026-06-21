import { PostSnapshot } from "@/shared/model/PostSnapshot";
import {
  e2eGetScrapingStatus,
  e2eGetScrapingStatusOrUndefinedIfNoCS,
} from "../extension-integration/cs/e2eGetScrapingStatus";
import { ScrapingSucceeded } from "@/shared/scraping-content-script/ScrapingStatus";
import { BrowserContext } from "@playwright/test";
import { e2eReadPostSnapshotByPostSnapshotId } from "../extension-integration/storage/e2eReadPostSnapshotByPostSnapshotId";
import { waitForConditionOrThrow } from "../utils/waitForCondition";

export async function e2eWaitForScrapingSuccess(
  context: BrowserContext,
  scrapingTabId: number,
  timeout: number,
): Promise<E2EScrapingSuccess> {
  await e2eWaitForScrapingEnd(timeout, context, scrapingTabId);
  const status = await e2eGetScrapingStatus(context, scrapingTabId);
  if (status.type === "succeeded") {
    const post = await e2eReadPostSnapshotByPostSnapshotId(
      context,
      status.postSnapshotId,
    );
    if (!post) {
      const errorMessage =
        "Scraping status is success but post snapshot with postSnapshotId cannot be found: " +
        status.postSnapshotId;
      console.error("[E2E] " + errorMessage);
      throw new Error(errorMessage);
    }
    console.info("[E2E] Scraping done for post url:" + post.url);
    return {
      status,
      postSnapshot: post,
    };
  }
  if (status.type === "failed") {
    const errorMessage = "Scraping failed: " + status.errorMessage;
    console.error("[E2E] " + errorMessage);
    throw new Error(errorMessage);
  }

  const errorMessage = `Unexpected scraping end status: ${status.type} \n${JSON.stringify(status)}`;
  console.error("[E2E] " + errorMessage);
  throw new Error(errorMessage);
}

export type E2EScrapingSuccess = {
  status: ScrapingSucceeded;
  postSnapshot: PostSnapshot;
};

async function e2eWaitForScrapingEnd(
  timeout: number,
  context: BrowserContext,
  scrapingTabId: number,
) {
  await waitForConditionOrThrow({
    timeout,
    condition: async () => {
      const status = await e2eGetScrapingStatusOrUndefinedIfNoCS(
        context,
        scrapingTabId,
      );
      return (
        status !== undefined &&
        (status.type === "failed" ||
          status.type === "canceled" ||
          status.type === "succeeded")
      );
    },
  });
}
