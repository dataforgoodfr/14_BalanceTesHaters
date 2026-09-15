import { describe, expect, test } from "vitest";
import { coverImageUrl } from "../coverImageUrl";

describe("coverImageUrl", () => {
  test("builds the YouTube cover image URL", () => {
    expect(coverImageUrl("video-id")).toBe(
      "https://i.ytimg.com/vi/video-id/hq720.jpg",
    );
  });
});
