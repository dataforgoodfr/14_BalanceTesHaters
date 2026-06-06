import { describe, expect, it } from "vitest";
import { getReportPostsQueryKey, REPORT_PDF_FILE_NAME } from "../report-data";

describe("report-data", () => {
  it("should build a stable query key from selected post ids", () => {
    expect(getReportPostsQueryKey(["post-1", "post-2"])).toEqual([
      "report-posts",
      ["post-1", "post-2"],
    ]);
  });

  it("should expose the expected download file name", () => {
    expect(REPORT_PDF_FILE_NAME).toBe("rapport-commentaires-malveillants.pdf");
  });
});
