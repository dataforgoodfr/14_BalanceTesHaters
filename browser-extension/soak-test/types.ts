import type {
  PostSnapshotCleanup,
  SoakControllerObservation,
  SoakControllerStatus,
} from "../src/shared/soak-test/SoakTestProtocol";

export type Platform = "youtube" | "instagram";

export type SoakTestScenario = {
  id: string;
  platform: Platform;
  url: string;
  approximateExpectedComments: number;
};

export type SoakTestManifest = {
  scenarios: SoakTestScenario[];
};

export type AttemtpStatus = SoakControllerStatus;

export type ScrapeObservation = SoakControllerObservation;

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
  status: AttemtpStatus;
  startedAt: string;
  durationMs: number;
  averageDurationPerCommentMs?: number;
  lastObservation?: ScrapeObservation;
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
};
