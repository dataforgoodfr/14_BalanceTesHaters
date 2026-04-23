import { describe, expect, it } from "vitest";
import {
  getEntriesGroupedByPostKey,
  getReportPostsQueryKey,
  REPORT_PDF_FILE_NAME,
} from "../report-data";

describe("report-data", () => {
  it("should build a stable query key from selected post ids", () => {
    expect(getReportPostsQueryKey(["post-1", "post-2"])).toEqual([
      "report-posts",
      ["post-1", "post-2"],
    ]);
  });

  it("should group comments by post key while preserving insertion order", () => {
    expect(
      getEntriesGroupedByPostKey([
        { id: "1", postKey: "post-a" },
        { id: "2", postKey: "post-b" },
        { id: "3", postKey: "post-a" },
      ]),
    ).toEqual([
      [
        "post-a",
        [
          { id: "1", postKey: "post-a" },
          { id: "3", postKey: "post-a" },
        ],
      ],
      ["post-b", [{ id: "2", postKey: "post-b" }]],
    ]);
  });

  it("should expose the expected download file name", () => {
    expect(REPORT_PDF_FILE_NAME).toBe("rapport-commentaires-malveillants.pdf");
  });
});
