import { describe, expect, it } from "vitest";
import {
  ScrapingRunningSchema,
  updateScrapingProgress,
  type ScrapingRunning,
} from "../ScrapingStatus";

const start = Date.parse("2026-11-17T12:00:00.000Z");
function running(): ScrapingRunning {
  return {
    type: "running",
    progress: 0,
    scrapingStartDate: new Date(start).toISOString(),
  };
}

describe("running scraping metadata", () => {
  it("estimates completion using elapsed time and precise progress", () => {
    const status = running();
    status.expectedCommentCount = 0;
    const updated = updateScrapingProgress(status, 0.5, start + 1000);
    expect(updated.progress).toBe(0.5);
    expect(updated).toEqual({
      type: "running",
      progress: 0.5,
      scrapingStartDate: new Date(start).toISOString(),
      expectedCommentCount: 0,
      estimatedETA: new Date(start + 200_000).toISOString(),
    });
    expect(ScrapingRunningSchema.parse(updated)).toEqual(updated);
    expect(
      updateScrapingProgress(updated, 50, start + 10_000).estimatedETA,
    ).toBe(new Date(start + 20_000).toISOString());
  });

  it("has no ETA before progress and predicts now at completion", () => {
    const status = updateScrapingProgress(running(), 50, start + 1000);
    expect(
      updateScrapingProgress(status, 0, start + 2000).estimatedETA,
    ).toBeUndefined();
    expect(updateScrapingProgress(status, 100, start + 2000).estimatedETA).toBe(
      new Date(start + 2000).toISOString(),
    );
    expect(ScrapingRunningSchema.parse(running())).not.toHaveProperty(
      "expectedCommentCount",
    );
  });
});
