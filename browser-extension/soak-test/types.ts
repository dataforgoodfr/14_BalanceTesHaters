import {
  SoakTestIdSchema,
  type PostSnapshotCleanup,
  type SoakControllerObservation,
  type SoakControllerStatus,
} from "../src/shared/soak-test/SoakTestProtocol";
import type { Settings } from "../src/shared/storage/settings-storage";
import { z } from "zod";

export const PlatformSchema = z.enum(["youtube", "instagram"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const SoakTestScenarioSchema = z
  .object({
    id: SoakTestIdSchema,
    platform: PlatformSchema,
    url: z.url(),
    approximateExpectedComments: z.int().positive(),
  })
  .strict()
  .superRefine((scenario, context) => {
    const hostname = new URL(scenario.url).hostname;
    const expectedHostname =
      scenario.platform === "youtube" ? "www.youtube.com" : "www.instagram.com";
    if (hostname !== expectedHostname) {
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: `URL does not match platform ${scenario.platform}`,
      });
    }
  });
export type SoakTestScenario = z.infer<typeof SoakTestScenarioSchema>;

export const SoakTestManifestSchema = z
  .object({
    scenarios: z.array(SoakTestScenarioSchema).min(1),
  })
  .strict()
  .superRefine((manifest, context) => {
    const scenarioIndexes = new Map<string, number>();
    for (const [index, scenario] of manifest.scenarios.entries()) {
      const previousIndex = scenarioIndexes.get(scenario.id);
      if (previousIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["scenarios", index, "id"],
          message: `Duplicate scenario id: ${scenario.id}`,
        });
      } else {
        scenarioIndexes.set(scenario.id, index);
      }
    }
  });
export type SoakTestManifest = z.infer<typeof SoakTestManifestSchema>;

export type CommentsStats = {
  expectedComments?: number;
  scrapedComments?: number;
  // scraped - expected
  countDelta?: number;
  // scraped / expected
  countRatio?: number;
  // (Math.abs(countDelta) / expected) * 100
  absolutePercentageDifference?: number;
  topLevelComments?: number;
  replyComments?: number;
};

export type AttemptResult = {
  attemptId: string;
  scenarioId: string;
  platform: Platform;
  url: string;
  repetition: number;
  status: SoakControllerStatus;
  startedAt: string;
  durationMs: number;
  averageDurationPerCommentMs?: number;
  lastObservation?: SoakControllerObservation;
  scraperError?: string;
  harnessError?: string;
  commentsStats: CommentsStats;
};

export type RunnerOptions = {
  manifestPath: string;
  runs: number;
  stallTimeoutMs: number;
  pollIntervalMs: number;
  outputDirectory?: string;
  scenarioIds?: string[];
  minExpectedComments?: number;
  maxExpectedComments?: number;
  platform?: Platform;
  postSnapshotCleanup: PostSnapshotCleanup;
  scrapingSettings: Settings;
};
