import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PostSnapshotCleanup } from "../src/shared/soak-test/SoakTestProtocol";
import type {
  RunnerOptions,
  SoakTestManifest,
  SoakTestScenario,
} from "./types";

const DEFAULT_MANIFEST = "soak-test/posts.json";
const RUNNER_OPTION_NAMES = new Set([
  "manifest",
  "runs",
  "stall-timeout",
  "poll-interval",
  "output",
  "scenario-ids",
  "min-expected-comments",
  "max-expected-comments",
  "platform",
  "post-snapshot-cleanup",
]);

export function parseRunnerOptions(argv: string[]): RunnerOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === "--") {
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const name = argument.slice(2);
    if (!RUNNER_OPTION_NAMES.has(name)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    values.set(name, value);
    index += 1;
  }

  const minExpectedComments = parseOptionalNonNegativeInteger(
    values.get("min-expected-comments"),
    "min-expected-comments",
  );
  const maxExpectedComments = parseOptionalNonNegativeInteger(
    values.get("max-expected-comments"),
    "max-expected-comments",
  );
  if (
    minExpectedComments !== undefined &&
    maxExpectedComments !== undefined &&
    minExpectedComments > maxExpectedComments
  ) {
    throw new Error(
      "--min-expected-comments must be less than or equal to --max-expected-comments.",
    );
  }

  return {
    manifestPath: path.resolve(values.get("manifest") ?? DEFAULT_MANIFEST),
    runs: parsePositiveInteger(values.get("runs") ?? "5", "runs"),
    stallTimeoutMs: parseDuration(
      values.get("stall-timeout") ?? "5m",
      "stall-timeout",
    ),
    pollIntervalMs: parseDuration(
      values.get("poll-interval") ?? "1s",
      "poll-interval",
    ),
    outputDirectory: values.get("output"),
    scenarioIds: parseScenarioIds(values.get("scenario-ids")),
    minExpectedComments,
    maxExpectedComments,
    platform: parsePlatform(values.get("platform")),
    postSnapshotCleanup: parsePostSnapshotCleanup(
      values.get("post-snapshot-cleanup"),
    ),
  };
}

export function filterScenarios(
  scenarios: SoakTestScenario[],
  options: Pick<
    RunnerOptions,
    "scenarioIds" | "minExpectedComments" | "maxExpectedComments" | "platform"
  >,
): SoakTestScenario[] {
  if (options.scenarioIds) {
    const knownIds = new Set(scenarios.map((scenario) => scenario.id));
    const unknownId = options.scenarioIds.find((id) => !knownIds.has(id));
    if (unknownId) {
      throw new Error(`Unknown scenario id: ${unknownId}`);
    }
  }

  const filtered = scenarios.filter(
    (scenario) =>
      (!options.scenarioIds || options.scenarioIds.includes(scenario.id)) &&
      (options.minExpectedComments === undefined ||
        scenario.approximateExpectedComments >= options.minExpectedComments) &&
      (options.maxExpectedComments === undefined ||
        scenario.approximateExpectedComments <= options.maxExpectedComments) &&
      (options.platform === undefined ||
        scenario.platform === options.platform),
  );
  if (filtered.length === 0) {
    throw new Error("No soak-test scenario matches the supplied filters.");
  }
  return filtered;
}

export async function readManifest(
  manifestPath: string,
): Promise<SoakTestManifest> {
  const parsed: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!isRecord(parsed) || !Array.isArray(parsed["scenarios"])) {
    throw new Error("The soak-test manifest must contain a scenarios array.");
  }
  const scenarios = parsed["scenarios"].map(parseScenario);
  if (scenarios.length === 0) {
    throw new Error("The soak-test manifest has no scenarios.");
  }
  const duplicateIds = scenarios
    .map((scenario) => scenario.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate scenario id: ${duplicateIds[0]}`);
  }
  return { scenarios };
}

function parseScenario(value: unknown, index: number): SoakTestScenario {
  if (!isRecord(value)) {
    throw new Error(`Scenario ${index + 1} must be an object.`);
  }
  const id = value["id"];
  const platform = value["platform"];
  const url = value["url"];
  const approximateExpectedComments = value["approximateExpectedComments"];
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Scenario ${index + 1} has no id.`);
  }
  if (platform !== "youtube" && platform !== "instagram") {
    throw new Error(`Scenario ${id} has an unsupported platform.`);
  }
  if (typeof url !== "string" || !URL.canParse(url)) {
    throw new Error(`Scenario ${id} has an invalid URL.`);
  }
  if (
    typeof approximateExpectedComments !== "number" ||
    !Number.isSafeInteger(approximateExpectedComments) ||
    approximateExpectedComments <= 0
  ) {
    throw new Error(
      `Scenario ${id} must have a positive approximateExpectedComments value.`,
    );
  }
  const hostname = new URL(url).hostname;
  if (
    (platform === "youtube" && hostname !== "www.youtube.com") ||
    (platform === "instagram" && hostname !== "www.instagram.com")
  ) {
    throw new Error(`Scenario ${id} URL does not match its platform.`);
  }
  return { id, platform, url, approximateExpectedComments };
}

function parseDuration(value: string, name: string): number {
  const match = /^(\d+)(ms|s|m)?$/.exec(value);
  if (!match) {
    throw new Error(`Invalid --${name} duration: ${value}`);
  }
  const amount = Number(match[1]);
  const multiplier = match[2] === "m" ? 60_000 : match[2] === "s" ? 1000 : 1;
  const result = amount * multiplier;
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new Error(`Invalid --${name} duration: ${value}`);
  }
  return result;
}

function parsePositiveInteger(value: string, name: string): number {
  const result = parseInteger(value, name);
  if (result <= 0) {
    throw new Error(`--${name} must be greater than zero.`);
  }
  return result;
}

function parseOptionalNonNegativeInteger(
  value: string | undefined,
  name: string,
): number | undefined {
  if (value === undefined) return undefined;
  const result = parseInteger(value, name);
  if (result < 0) {
    throw new Error(`--${name} must be zero or greater.`);
  }
  return result;
}

function parseScenarioIds(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const ids = value.split(",").map((id) => id.trim());
  if (ids.some((id) => id.length === 0)) {
    throw new Error("--scenario-ids must contain comma-separated ids.");
  }
  return [...new Set(ids)];
}

function parsePlatform(
  value: string | undefined,
): "youtube" | "instagram" | undefined {
  if (value === undefined) return undefined;
  if (value !== "youtube" && value !== "instagram") {
    throw new Error("--platform must be youtube or instagram.");
  }
  return value;
}

function parsePostSnapshotCleanup(
  value: string | undefined,
): PostSnapshotCleanup {
  if (value === undefined) return "keep";
  if (
    value !== "keep" &&
    value !== "before-each-attempt" &&
    value !== "on-start"
  ) {
    throw new Error(
      "--post-snapshot-cleanup must be keep, before-each-attempt, or on-start.",
    );
  }
  return value;
}

function parseInteger(value: string, name: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`--${name} must be an integer.`);
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
