import { describe, expect, test } from "vitest";
import { isYoutubeShortUrl } from "../isYoutubeShortUrl";

describe("isYoutubeShortUrl", () => {
  test("identifies Shorts URLs", () => {
    expect(isYoutubeShortUrl("https://www.youtube.com/shorts/video-id")).toBe(
      true,
    );
  });

  test("rejects regular video URLs", () => {
    expect(isYoutubeShortUrl("https://www.youtube.com/watch?v=video-id")).toBe(
      false,
    );
  });
});
