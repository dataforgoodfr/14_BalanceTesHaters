import { PostSnapshotSchema } from "@/shared/model/PostSnapshot";
import { ScraperLogEntrySchema } from "./SoakTestScraperLogCapture";
import { ScrapingStatusSchema } from "@/shared/scraping-content-script/ScrapingStatus";
import { z } from "zod";

export const SOAK_TEST_CONTROLLER_PORT = 38_471;
export const SOAK_TEST_CONTROLLER_URL = `http://127.0.0.1:${SOAK_TEST_CONTROLLER_PORT}/bth-soak-test`;

export const SoakTestIdSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9_-]*$/i,
    "must contain only letters, numbers, underscores, and hyphens",
  );

export const SoakControllerAttemptSchema = z
  .object({
    attemptId: SoakTestIdSchema,
    scenarioId: SoakTestIdSchema,
    platform: z.enum(["youtube", "instagram"]),
    url: z.url(),
    repetition: z.int().positive(),
    hardTimeoutMs: z.int().positive(),
  })
  .strict();
export type SoakControllerAttempt = z.infer<typeof SoakControllerAttemptSchema>;

export const PostSnapshotCleanupSchema = z.enum([
  "keep",
  "before-each-attempt",
  "on-start",
]);
export type PostSnapshotCleanup = z.infer<typeof PostSnapshotCleanupSchema>;

export const SoakControllerConfigSchema = z
  .object({
    attempts: z.array(SoakControllerAttemptSchema).min(1),
    stallTimeoutMs: z.int().positive(),
    pollIntervalMs: z.int().positive(),
    postSnapshotCleanup: PostSnapshotCleanupSchema,
  })
  .strict();
export type SoakControllerConfig = z.infer<typeof SoakControllerConfigSchema>;

export const SoakTestProcessUsageSchema = z
  .object({
    recordedAt: z.iso.datetime(),
    cpuPercent: z.number().nonnegative().optional(),
    jsMemoryUsedBytes: z.number().nonnegative().optional(),
    jsMemoryAllocatedBytes: z.number().nonnegative().optional(),
  })
  .strict();
export type SoakTestProcessUsage = z.infer<typeof SoakTestProcessUsageSchema>;

export const SoakControllerObservationSchema = z
  .object({
    recordedAt: z.iso.datetime(),
    elapsedMs: z.number().nonnegative(),
    status: ScrapingStatusSchema.optional(),
    contentScriptReachable: z.boolean(),
    loadedDomComments: z.int().nonnegative().optional(),
    pageUrl: z.url().optional(),
    pageVisibilityState: z.enum(["visible", "hidden"]).optional(),
    documentHasFocus: z.boolean().optional(),
    tabActive: z.boolean().optional(),
    tabDiscarded: z.boolean().optional(),
    tabFrozen: z.boolean().optional(),
    tabLastAccessed: z.number().nonnegative().optional(),
    windowFocused: z.boolean().optional(),
    processUsage: SoakTestProcessUsageSchema.optional(),
  })
  .strict();
export type SoakControllerObservation = z.infer<
  typeof SoakControllerObservationSchema
>;

export const SoakControllerStatusSchema = z.enum([
  "success",
  "warning",
  "scraper_error",
  "stalled",
  "hard_timeout",
  "content_script_lost",
  "harness_error",
]);
export type SoakControllerStatus = z.infer<typeof SoakControllerStatusSchema>;

export const SoakControllerResultSchema = z
  .object({
    attempt: SoakControllerAttemptSchema,
    status: SoakControllerStatusSchema,
    startedAt: z.iso.datetime(),
    durationMs: z.number().nonnegative(),
    lastObservation: SoakControllerObservationSchema.optional(),
    scraperError: z.string().optional(),
    harnessError: z.string().optional(),
    expectedComments: z.int().nonnegative().optional(),
    scrapedComments: z.int().nonnegative().optional(),
    topLevelComments: z.int().nonnegative().optional(),
    replyComments: z.int().nonnegative().optional(),
  })
  .strict();
export type SoakControllerResult = z.infer<typeof SoakControllerResultSchema>;

export const SoakControllerAttemptStartedSchema = z
  .object({
    attempt: SoakControllerAttemptSchema,
  })
  .strict();

export const SoakControllerObservationEventSchema = z
  .object({
    attemptId: SoakTestIdSchema,
    observation: SoakControllerObservationSchema,
  })
  .strict();

export const SoakControllerExpectedCommentsEventSchema = z
  .object({
    attemptId: SoakTestIdSchema,
    expectedComments: z.int().nonnegative(),
  })
  .strict();

export const SoakControllerScraperLogSchema = z
  .object({
    attemptId: SoakTestIdSchema,
    entry: ScraperLogEntrySchema,
  })
  .strict();

export const SoakControllerScrapedPostSchema = z
  .object({
    attemptId: SoakTestIdSchema,
    postSnapshot: PostSnapshotSchema,
  })
  .strict();

export const SoakControllerFatalSchema = z
  .object({
    error: z.string(),
  })
  .strict();

export const SoakControllerEmptyPayloadSchema = z.object({}).strict();

export const SoakControllerAcknowledgementSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();
