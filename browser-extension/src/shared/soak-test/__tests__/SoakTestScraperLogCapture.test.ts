import { Logger } from "tslog";
import { describe, expect, it } from "vitest";
import {
  createSoakTestScraperLogEntry,
  type ScraperLogEntry,
} from "../SoakTestScraperLogCapture";

describe("createSoakTestScraperLogEntry", () => {
  it("converts a child logger record into a captured scraper log", () => {
    const rootLogger = new Logger<Record<string, unknown>>({
      name: "bth",
      stack: { capture: "off" },
      type: "hidden",
    });
    const scrapingLogger = rootLogger.getSubLogger({ name: "scrap" });
    const capturedEntries: ScraperLogEntry[] = [];
    scrapingLogger.attachTransport((record) => {
      capturedEntries.push(createSoakTestScraperLogEntry(record));
    });

    scrapingLogger
      .getSubLogger({ name: "yt-comments" })
      .warn("Loaded comments", { count: 42 });

    expect(capturedEntries[0]).toMatchObject({
      level: "warn",
      message: '[bth:scrap:yt-comments] Loaded comments {"count":42}',
    });
    expect(capturedEntries[0]?.recordedAt).toEqual(expect.any(String));
  });

  it("preserves the keys of structured log records", () => {
    const logger = new Logger<Record<string, unknown>>({
      name: "scrap",
      stack: { capture: "off" },
      type: "hidden",
    });
    const capturedEntries: ScraperLogEntry[] = [];
    logger.attachTransport((record) => {
      capturedEntries.push(createSoakTestScraperLogEntry(record));
    });

    logger.info({ scrapedComments: 12 });

    expect(capturedEntries[0]).toMatchObject({
      level: "info",
      message: '[scrap] {"scrapedComments":12}',
    });
  });
});
