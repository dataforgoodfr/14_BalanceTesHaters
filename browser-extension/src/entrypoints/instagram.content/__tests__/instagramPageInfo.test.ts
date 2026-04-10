import { describe, expect, it } from "vitest";
import { instagramPageInfo } from "../instagramPageInfo";

describe("instagramPageInfo", () => {
  it("returns scrapable info for /p/<id>", () => {
    expect(
      instagramPageInfo("https://www.instagram.com/p/ABC123/"),
    ).toMatchObject({
      isScrapablePost: true,
      postId: "ABC123",
    });
  });

  it("returns scrapable info for /reel/<id>", () => {
    expect(
      instagramPageInfo("https://www.instagram.com/reel/DW6WIBXDQhN/"),
    ).toMatchObject({
      isScrapablePost: true,
      postId: "DW6WIBXDQhN",
    });
  });

  it("returns scrapable info for /reels/<id>", () => {
    expect(
      instagramPageInfo("https://www.instagram.com/reels/DW6WIBXDQhN/"),
    ).toMatchObject({
      isScrapablePost: true,
      postId: "DW6WIBXDQhN",
    });
  });

  it("returns not scrapable for non post/reel routes", () => {
    expect(instagramPageInfo("https://www.instagram.com/explore/")).toEqual({
      isScrapablePost: false,
    });
  });

  it("returns not scrapable for /reels/ listing route without id", () => {
    expect(instagramPageInfo("https://www.instagram.com/reels/")).toEqual({
      isScrapablePost: false,
    });
  });

  it("returns not scrapable for /reels/audio/<id> route", () => {
    expect(
      instagramPageInfo(
        "https://www.instagram.com/reels/audio/26246882584981015/",
      ),
    ).toEqual({
      isScrapablePost: false,
    });
  });
});
