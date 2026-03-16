import { getPostSnapshotsPendingClassification } from "@/shared/storage/post-snapshot-storage";
import { updatePostWithClassificationResult } from "./updatePostWithClassificationResult";

/**
 * Register and start the classification results polling.
 * This will periodically check for classification results for posts that are
 * pending classification.
 */
export function startClassificationPolling(
  pollingIntervalMinutes: number = 1,
): void {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CLASSIFICATION_POLLING_ALARM_NAME) {
      onClassificationPollingAlarm();
    }
  });
  browser.alarms.create(CLASSIFICATION_POLLING_ALARM_NAME, {
    delayInMinutes: 1, // First run after 1 minute
    periodInMinutes: pollingIntervalMinutes, // Then every CLASSIFICATION_POLLING_INTERVAL_MINUTES minutes
  });
}

const CLASSIFICATION_POLLING_ALARM_NAME = "classification-polling-alarm";

async function onClassificationPollingAlarm(): Promise<void> {
  try {
    console.debug(
      "[Classification Polling] - Listing posts pending classification...",
    );
    const pendingPosts = await getPostSnapshotsPendingClassification();

    if (pendingPosts.length === 0) {
      console.debug(
        "[Classification Polling] - Completed - No posts pending classification",
      );
      return;
    }

    console.debug(
      `[Classification Polling] - Found ${pendingPosts.length} posts pending classification - Fetching results...`,
    );

    let errorCount = 0;
    for (const post of pendingPosts) {
      try {
        await updatePostWithClassificationResult(post.id);
      } catch (error) {
        console.error(
          "[Classification Polling] - Failed for snapshotPostId:",
          post.id,
          " with error",
          error,
        );
        errorCount++;
      }
    }
    const logFn = errorCount > 0 ? console.info : console.debug;
    logFn(
      `[Classification Polling] - Completed - Success: ${pendingPosts.length - errorCount}, Failed: ${errorCount}`,
    );
  } catch (error) {
    console.error("Error during classification polling:", error);
  }
}
