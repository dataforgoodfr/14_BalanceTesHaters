import { describe, it, expect } from "vitest";
import { extractCommentIdFromCommentHref } from "../extractCommentIdFromCommentHref";

describe("extractCommentIdFromCommentHref", () => {
  it("should extract comment id from valid href with lc parameter", () => {
    const href =
      "https://www.youtube.com/watch?v=0eHZRPzbiJ0&lc=Ugwfqc-ST80r1oLPzFh4AaABAg";
    const result = extractCommentIdFromCommentHref(href);
    expect(result).toBe("Ugwfqc-ST80r1oLPzFh4AaABAg");
  });

  it("should throw error when lc parameter is missing", () => {
    const href = "https://www.youtube.com/watch?v=0eHZRPzbiJ0";
    expect(() => extractCommentIdFromCommentHref(href)).toThrow(
      "Cannot find comment id on link",
    );
  });
});
