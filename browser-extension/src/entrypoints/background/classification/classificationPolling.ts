import { getPostSnapshotsPendingClassification } from "@/shared/storage/post-snapshot-storage";
import { updatePostWithClassificationResult } from "./updatePostWithClassificationResult";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { notifyClassificationCompleted } from "./notifyClassificationCompleted";

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
      void onClassificationPollingAlarm();
    }
  });
  void browser.alarms.create(CLASSIFICATION_POLLING_ALARM_NAME, {
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
    const snapshotsWithCompletedClassifications: PostSnapshot[] = [];
    for (const post of pendingPosts) {
      try {
        const classificationResult = await updatePostWithClassificationResult(
          post.id,
        );
        if (classificationResult.status === "COMPLETED") {
          snapshotsWithCompletedClassifications.push(post);
        }
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
    if (snapshotsWithCompletedClassifications.length > 0) {
      console.debug(
        "Notifying user of " +
          snapshotsWithCompletedClassifications.length +
          " completed classifications.",
      );
      notifyClassificationCompleted(snapshotsWithCompletedClassifications);
    }
  } catch (error) {
    console.error("Error during classification polling:", error);
  }
}
