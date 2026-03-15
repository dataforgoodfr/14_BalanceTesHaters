export type ScrapingStatus =
  | ScrapingNotStarted
  | ScrapingRunning
  | ScrapingCanceling
  | ScrapingSucceeded
  | ScrapingFailed
  | ScrapingCanceled;

export type ScrapingNotStarted = {
  type: "not-started";
};
export type ScrapingRunning = {
  type: "running";
  /**
   * Progress percent
   */
  progress: number;
};
/**
 * Scraping completed successfully
 */
export type ScrapingSucceeded = {
  type: "succeeded";
  postSnapshotId: string;
  durationMs: number;
};
/**
 * Scraping failed with an error
 */
export type ScrapingFailed = {
  type: "failed";
  /** Error message */
  errorMessage: string;
};

/**
 * Cancel has been requested but it didn't stop yet
 */
export type ScrapingCanceling = {
  type: "canceling";
};

export type ScrapingCanceled = {
  type: "canceled";
};

export function scrapingFailed(errorMessage: string): ScrapingFailed {
  return {
    type: "failed",
    errorMessage: errorMessage,
  };
}

/**
 * Returns true if scraping is Completed or not started and a new scraping can be started
 * @param scrapingStatus
 * @returns
 */
export function isScrapingStartable(
  scrapingStatus: ScrapingStatus,
): scrapingStatus is
  | ScrapingSucceeded
  | ScrapingFailed
  | ScrapingCanceled
  | ScrapingNotStarted {
  return (
    scrapingStatus.type === "not-started" || isScrapingCompleted(scrapingStatus)
  );
}

/**
 * Returns true if scraping is in progress (running or canceling but not completely canceled yet)
 * @param scrapingStatus
 */
export function isScrapingInProgress(
  scrapingStatus: ScrapingStatus,
): scrapingStatus is ScrapingRunning | ScrapingCanceling {
  return (
    scrapingStatus.type === "running" || scrapingStatus.type === "canceling"
  );
}

/**
 * Returns true of scraping is completed with success, failure or canceled
 * @param scrapingStatus
 * @returns
 */
export function isScrapingCompleted(
  scrapingStatus: ScrapingStatus,
): scrapingStatus is ScrapingSucceeded | ScrapingFailed | ScrapingCanceled {
  return (
    scrapingStatus.type === "succeeded" ||
    scrapingStatus.type === "failed" ||
    scrapingStatus.type === "canceled"
  );
}
