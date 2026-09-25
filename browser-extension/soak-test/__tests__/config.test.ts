import { describe, expect, it } from "vitest";
import { filterScenarios, parseRunnerOptions } from "../config";
import type { SoakTestScenario } from "../types";

const scenarios: SoakTestScenario[] = [
  {
    id: "youtube-small",
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=small",
    approximateExpectedComments: 50,
  },
  {
    id: "youtube-large",
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=large",
    approximateExpectedComments: 1_000,
  },
  {
    id: "instagram-medium",
    platform: "instagram",
    url: "https://www.instagram.com/p/medium",
    approximateExpectedComments: 500,
  },
];

describe("soak-test scenario filters", () => {
  it("keeps post snapshots by default", () => {
    expect(parseRunnerOptions([]).postSnapshotCleanup).toBe("keep");
  });

  it.each(["keep", "before-each-attempt", "on-start"] as const)(
    "parses the %s post-snapshot cleanup mode",
    (postSnapshotCleanup) => {
      expect(
        parseRunnerOptions(["--post-snapshot-cleanup", postSnapshotCleanup])
          .postSnapshotCleanup,
      ).toBe(postSnapshotCleanup);
    },
  );

  it("rejects an unknown post-snapshot cleanup mode", () => {
    expect(() =>
      parseRunnerOptions(["--post-snapshot-cleanup", "sometimes"]),
    ).toThrow(
      "--post-snapshot-cleanup must be keep, before-each-attempt, or on-start",
    );
  });

  it("parses filter options", () => {
    const options = parseRunnerOptions([
      "--scenario-ids",
      "youtube-small, youtube-large,youtube-small",
      "--min-expected-comments",
      "40",
      "--max-expected-comments",
      "1000",
      "--platform",
      "youtube",
    ]);

    expect(options).toMatchObject({
      scenarioIds: ["youtube-small", "youtube-large"],
      minExpectedComments: 40,
      maxExpectedComments: 1_000,
      platform: "youtube",
    });
  });

  it("combines all supplied filters", () => {
    expect(
      filterScenarios(scenarios, {
        scenarioIds: ["youtube-small", "youtube-large"],
        minExpectedComments: 100,
        maxExpectedComments: 1_000,
        platform: "youtube",
      }).map((scenario) => scenario.id),
    ).toEqual(["youtube-large"]);
  });

  it("rejects invalid ranges", () => {
    expect(() =>
      parseRunnerOptions([
        "--min-expected-comments",
        "1000",
        "--max-expected-comments",
        "100",
      ]),
    ).toThrow("--min-expected-comments must be less than or equal");
  });

  it("rejects unknown ids and empty results", () => {
    expect(() =>
      filterScenarios(scenarios, { scenarioIds: ["missing"] }),
    ).toThrow("Unknown scenario id: missing");
    expect(() =>
      filterScenarios(scenarios, { minExpectedComments: 2_000 }),
    ).toThrow("No soak-test scenario matches");
  });
});
