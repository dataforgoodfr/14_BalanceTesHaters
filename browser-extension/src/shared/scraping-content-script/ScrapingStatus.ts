import { z } from "zod";

export const ScrapingNotStartedSchema = z.object({
  type: z.literal("not-started"),
});
export type ScrapingNotStarted = z.infer<typeof ScrapingNotStartedSchema>;

export const ScrapingRunningSchema = z.object({
  type: z.literal("running"),
  progress: z.number().min(0).max(100),
});
export type ScrapingRunning = z.infer<typeof ScrapingRunningSchema>;

/**
 * Scraping completed successfully
 */
export const ScrapingSucceededSchema = z.object({
  type: z.literal("succeeded"),
  postSnapshotId: z.string(),
  durationMs: z.number().nonnegative(),
});
export type ScrapingSucceeded = z.infer<typeof ScrapingSucceededSchema>;

/**
 * Scraping failed with an error
 */
export const ScrapingFailedSchema = z.object({
  type: z.literal("failed"),
  /** Error message */
  errorMessage: z.string(),
});
export type ScrapingFailed = z.infer<typeof ScrapingFailedSchema>;

/**
 * Cancel has been requested but it didn't stop yet
 */
export const ScrapingCancelingSchema = z.object({
  type: z.literal("canceling"),
});
export type ScrapingCanceling = z.infer<typeof ScrapingCancelingSchema>;

export const ScrapingCanceledSchema = z.object({
  type: z.literal("canceled"),
});
export type ScrapingCanceled = z.infer<typeof ScrapingCanceledSchema>;

export const ScrapingStatusSchema = z.discriminatedUnion("type", [
  ScrapingNotStartedSchema,
  ScrapingRunningSchema,
  ScrapingCancelingSchema,
  ScrapingSucceededSchema,
  ScrapingFailedSchema,
  ScrapingCanceledSchema,
]);
export type ScrapingStatus = z.infer<typeof ScrapingStatusSchema>;

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
  ScrapingSucceeded | ScrapingFailed | ScrapingCanceled | ScrapingNotStarted {
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
