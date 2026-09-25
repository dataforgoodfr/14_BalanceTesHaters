import {
  getPostSnapshotsPendingSubmission,
  getPostSnapshotsPendingResults,
} from "@/shared/storage/post-snapshot-storage";
import { updatePostWithClassificationResult } from "./updatePostWithClassificationResult";
import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import { notifyClassificationCompleted } from "./notifyClassificationCompleted";
import { submitClassificationRequestForPost } from "./submitClassificationForPost";
import { createLogger } from "@/shared/utils/createLogger";
import { getSettings } from "@/shared/storage/settings-storage";

const logger = createLogger("classification-polling");

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
    const settings = await getSettings();
    if (!settings.skipSubmitForClassification) {
      await submitPendingClassifications();
    } else {
      logger.debug("Skipping pending submissions because of settings");
    }
    const snapshotsWithCompletedClassifications =
      await pollClassificationResults();

    if (snapshotsWithCompletedClassifications.length > 0) {
      logger.debug(
        "Notifying user of " +
          snapshotsWithCompletedClassifications.length +
          " completed classifications.",
      );
      notifyClassificationCompleted(snapshotsWithCompletedClassifications);
    }
  } catch (error) {
    logger.error("Polling failed", error);
  }
}

async function submitPendingClassifications(): Promise<void> {
  logger.debug("Submitting classifications for posts pending submission...");
  const postsPendingSubmission = await getPostSnapshotsPendingSubmission();

  if (postsPendingSubmission.length === 0) {
    logger.debug("No posts pending submission");
    return;
  }

  logger.debug(
    `Submitting ${postsPendingSubmission.length} posts for classification...`,
  );

  let errorCount = 0;
  for (const postSnapshot of postsPendingSubmission) {
    try {
      await submitClassificationRequestForPost(postSnapshot.id);
    } catch (error) {
      logger.error(
        "Failed to submit classification for snapshotPostId:",
        postSnapshot.id,
        " with error",
        error,
      );
      errorCount++;
    }
  }

  const completionMessage = `Submission completed - Success: ${postsPendingSubmission.length - errorCount}, Failed: ${errorCount}`;
  if (errorCount > 0) {
    logger.info(completionMessage);
  } else {
    logger.debug(completionMessage);
  }
}

async function pollClassificationResults(): Promise<PostSnapshot[]> {
  logger.debug("Fetching classification results for posts pending results...");
  const postsPendingResults = await getPostSnapshotsPendingResults();

  if (postsPendingResults.length === 0) {
    logger.debug("No posts pending results");
    return [];
  }

  logger.debug(`Fetching results for ${postsPendingResults.length} posts...`);

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
      logger.error(
        "Failed to fetch results for snapshotPostId:",
        postSnapshot.id,
        " with error",
        error,
      );
      errorCount++;
    }
  }

  const completionMessage = `Results polling completed - Success: ${postsPendingResults.length - errorCount}, Failed: ${errorCount}`;
  if (errorCount > 0) {
    logger.info(completionMessage);
  } else {
    logger.debug(completionMessage);
  }
  return snapshotsWithCompletedClassifications;
}
