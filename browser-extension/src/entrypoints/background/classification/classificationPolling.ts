import {
  getPostSnapshotsPendingSubmission,
  getPostSnapshotsPendingResults,
} from "@/shared/storage/post-snapshot-storage";
import { updatePostWithClassificationResult } from "./updatePostWithClassificationResult";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { notifyClassificationCompleted } from "./notifyClassificationCompleted";
import { submitClassificationRequestForPost } from "./submitClassificationForPost";

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
      void handleClassificationPollingAlarm();
    }
  });
  void browser.alarms.create(CLASSIFICATION_POLLING_ALARM_NAME, {
    delayInMinutes: 1, // First run after 1 minute
    periodInMinutes: pollingIntervalMinutes, // Then every CLASSIFICATION_POLLING_INTERVAL_MINUTES minutes
  });
}

const CLASSIFICATION_POLLING_ALARM_NAME = "classification-polling-alarm";

async function handleClassificationPollingAlarm(): Promise<void> {
  try {
    await submitPendingClassifications();
    const snapshotsWithCompletedClassifications =
      await pollClassificationResults();

    if (snapshotsWithCompletedClassifications.length > 0) {
      console.debug(
        "[Classification Polling] - Notifying user of " +
          snapshotsWithCompletedClassifications.length +
          " completed classifications.",
      );
      notifyClassificationCompleted(snapshotsWithCompletedClassifications);
    }
  } catch (error) {
    console.error("[Classification Polling] - Error during polling:", error);
  }
}

async function submitPendingClassifications(): Promise<void> {
  console.debug(
    "[Classification Polling] - Submitting classifications for posts pending submission...",
  );
  const postsPendingSubmission = await getPostSnapshotsPendingSubmission();

  if (postsPendingSubmission.length === 0) {
    console.debug("[Classification Polling] - No posts pending submission");
    return;
  }

  console.debug(
    `[Classification Polling] - Submitting ${postsPendingSubmission.length} posts for classification...`,
  );

  let errorCount = 0;
  for (const postSnapshot of postsPendingSubmission) {
    try {
      await submitClassificationRequestForPost(postSnapshot.id);
    } catch (error) {
      console.error(
        "[Classification Polling] - Failed to submit classification for snapshotPostId:",
        postSnapshot.id,
        " with error",
        error,
      );
      errorCount++;
    }
  }

  const logFn = errorCount > 0 ? console.info : console.debug;
  logFn(
    `[Classification Polling] - Submission completed - Success: ${postsPendingSubmission.length - errorCount}, Failed: ${errorCount}`,
  );
}

async function pollClassificationResults(): Promise<PostSnapshot[]> {
  console.debug(
    "[Classification Polling] - Fetching classification results for posts pending results...",
  );
  const postsPendingResults = await getPostSnapshotsPendingResults();

  if (postsPendingResults.length === 0) {
    console.debug("[Classification Polling] - No posts pending results");
    return [];
  }

  console.debug(
    `[Classification Polling] - Fetching results for ${postsPendingResults.length} posts...`,
  );

  let errorCount = 0;
  const snapshotsWithCompletedClassifications: PostSnapshot[] = [];
  for (const postSnapshot of postsPendingResults) {
    try {
      const classificationResult = await updatePostWithClassificationResult(
        postSnapshot.id,
      );
      if (classificationResult.status === "COMPLETED") {
        snapshotsWithCompletedClassifications.push(postSnapshot);
      }
    } catch (error) {
      console.error(
        "[Classification Polling] - Failed to fetch results for snapshotPostId:",
        postSnapshot.id,
        " with error",
        error,
      );
      errorCount++;
    }
  }

  const logFn = errorCount > 0 ? console.info : console.debug;
  logFn(
    `[Classification Polling] - Results polling completed - Success: ${postsPendingResults.length - errorCount}, Failed: ${errorCount}`,
  );
  return snapshotsWithCompletedClassifications;
}
