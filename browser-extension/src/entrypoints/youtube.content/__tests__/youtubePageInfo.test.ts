import { describe, expect, test } from "vitest";
import { youtubePageInfo } from "../youtubePageInfo";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

describe("youtubePageInfo", () => {
  test("returns watch video info", () => {
    expect(
      youtubePageInfo("https://www.youtube.com/watch?v=test-video-id"),
    ).toEqual({
      isScrapablePost: true,
      socialNetwork: SocialNetwork.YouTube,
      postId: "test-video-id",
    });
  });

  test("returns shorts video info", () => {
    expect(
      youtubePageInfo("https://www.youtube.com/shorts/test-short-id"),
    ).toEqual({
      isScrapablePost: true,
      socialNetwork: SocialNetwork.YouTube,
      postId: "test-short-id",
    });
  });

  test("returns non scrapable for non-post shorts subroutes", () => {
    expect(
      youtubePageInfo("https://www.youtube.com/shorts/audio/test"),
    ).toEqual({
      isScrapablePost: false,
    });
  });
});
