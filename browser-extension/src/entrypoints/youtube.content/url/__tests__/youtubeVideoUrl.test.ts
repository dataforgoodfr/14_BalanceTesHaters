import { describe, expect, test } from "vitest";
import { youtubeVideoUrl } from "../youtubeVideoUrl";

describe("youtubeVideoUrl", () => {
  test("builds a YouTube watch URL", () => {
    expect(youtubeVideoUrl("video-id")).toBe(
      "https://www.youtube.com/watch?v=video-id",
    );
  });
});
