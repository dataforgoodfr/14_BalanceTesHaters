import { describe, it, expect } from "vitest";
import { getEarliestPostDate } from "../post-util";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { Post } from "@/shared/model/post/Post";

/**
 * Helper function to create a dummy Post list with a specific publication date
 * @param publishedAt - The publication date for the post
 * @returns Array containing a single Post with dummy data
 */
function createDummyPostWithDate(publishedAt: PublicationDate): Post {
  return {
    postId: "dummy-post-1",
    socialNetwork: SocialNetwork.YouTube,
    url: "https://www.youtube.com/watch?v=dummy",
    publishedAt,
    author: {
      name: "Dummy Author",
      accountHref: "https://youtube.com/@dummyauthor",
    },
    lastAnalysisDate: new Date().toLocaleDateString(),
    comments: [],
  };
}

describe("post utilities", () => {
  describe("getEarliestPostDate", () => {
    it("undefined should get current date", () => {
      const postList = undefined;

      const result = getEarliestPostDate(postList);
      expect(result.toLocaleDateString()).toBe(new Date().toLocaleDateString());
    });

    it("No posts provided, should get current date", () => {
      const postList: Post[] = [];

      const result = getEarliestPostDate(postList);
      expect(result.toLocaleDateString()).toBe(new Date().toLocaleDateString());
    });

    it("unknown date should get current date", () => {
      const post = createDummyPostWithDate({
        type: "unknown date",
        dateText: "unknown",
      });

      const result = getEarliestPostDate([post]);
      expect(result.toLocaleDateString()).toBe(new Date().toLocaleDateString());
    });

    it("absolute date should get absolute date", () => {
      const post = createDummyPostWithDate({
        type: "absolute",
        date: new Date("2024-01-01").toLocaleDateString(),
      });

      const result = getEarliestPostDate([post]);
      expect(result.toLocaleDateString()).toBe(
        new Date("2024-01-01").toLocaleDateString(),
      );
    });

    it("relative date should get start date", () => {
      const post = createDummyPostWithDate({
        type: "relative",
        dateText: "xx days ago",
        resolvedDateRange: {
          start: new Date("2024-01-01").toLocaleDateString(),
          end: new Date("2024-01-10").toLocaleDateString(),
        },
      });

      const result = getEarliestPostDate([post]);
      expect(result.toLocaleDateString()).toBe(
        new Date("2024-01-01").toLocaleDateString(),
      );
    });

    it("unknown + absolute date should get absolute date", () => {
      const absolutePost = createDummyPostWithDate({
        type: "absolute",
        date: new Date("2024-01-01").toLocaleDateString(),
      });
      const unknownPost = createDummyPostWithDate({
        type: "unknown date",
        dateText: "unknown",
      });

      const result = getEarliestPostDate([absolutePost, unknownPost]);
      expect(result.toLocaleDateString()).toBe(
        new Date("2024-01-01").toLocaleDateString(),
      );
    });

    it("absolute + relative date should get earliest date", () => {
      const relativePost = createDummyPostWithDate({
        type: "relative",
        dateText: "xx days ago",
        resolvedDateRange: {
          start: new Date("2024-01-01").toLocaleDateString(),
          end: new Date("2024-01-10").toLocaleDateString(),
        },
      });
      const absolutePost = createDummyPostWithDate({
        type: "absolute",
        date: new Date("2024-01-05").toLocaleDateString(),
      });

      const result = getEarliestPostDate([relativePost, absolutePost]);
      expect(result.toLocaleDateString()).toBe(
        new Date("2024-01-01").toLocaleDateString(),
      );
    });
  });
});
