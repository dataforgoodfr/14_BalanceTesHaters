import { describe, it, expect } from "vitest";
import {
  getEarliestPostDate,
  filterPosts,
  PostFilters,
  NbHatefulCommentsOptions,
  emptyPostFilters,
} from "../post-util";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { Post, PostComment } from "@/shared/model/post/Post";

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

/**
 * Helper function to create a dummy Post with custom properties
 */
function createDummyPost(overrides: Partial<Post> = {}): Post {
  return {
    postId: "dummy-post-1",
    socialNetwork: SocialNetwork.YouTube,
    url: "https://www.youtube.com/watch?v=dummy",
    title: "Test Post Title",
    textContent: "Test content",
    publishedAt: {
      type: "absolute",
      date: new Date().toLocaleDateString(),
    },
    author: {
      name: "Dummy Author",
      accountHref: "https://youtube.com/@dummyauthor",
    },
    lastAnalysisDate: new Date().toLocaleDateString(),
    comments: [],
    ...overrides,
  };
}

/**
 * Helper function to create a hateful comment
 */
function createHatefulComment(
  textContent: string = "hateful comment",
): PostComment {
  return {
    author: { name: "Author", accountHref: "https://example.com" },
    textContent,
    publishedAt: {
      type: "absolute",
      date: new Date().toISOString(),
    },
    classification: ["Cyberharcèlement (autre)"],
    screenshotData:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    isNew: false,
    isDeleted: false,
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

  describe("filterPosts", () => {
    describe("search term filtering", () => {
      it("should filter posts by title", () => {
        const posts = [
          createDummyPost({ title: "JavaScript Tutorial" }),
          createDummyPost({ title: "Python Guide" }),
          createDummyPost({ title: "JavaScript Advanced" }),
        ];

        const result = filterPosts(posts, "JavaScript", emptyPostFilters);

        expect(result).toHaveLength(2);
        expect(result.every((p) => p.title?.includes("JavaScript"))).toBe(true);
      });

      it("should filter posts by textContent (description)", () => {
        const posts = [
          createDummyPost({ textContent: "This is a great tutorial" }),
          createDummyPost({ textContent: "Complete guide for beginners" }),
          createDummyPost({ textContent: "Another tutorial here" }),
        ];

        const result = filterPosts(posts, "tutorial", emptyPostFilters);

        expect(result).toHaveLength(2);
      });

      it("should filter posts by url", () => {
        const posts = [
          createDummyPost({ url: "https://youtube.com/watch?v=abc123" }),
          createDummyPost({ url: "https://youtube.com/watch?v=xyz789" }),
          createDummyPost({
            url: "https://instagram.com/p/abc123",
          }),
        ];

        const result = filterPosts(posts, "abc123", emptyPostFilters);

        expect(result).toHaveLength(2);
      });

      it("should filter posts by comments content", () => {
        const posts = [
          createDummyPost({
            comments: [
              {
                author: { name: "User", accountHref: "" },
                textContent: "This is spam content",
                publishedAt: {
                  type: "absolute",
                  date: new Date().toISOString(),
                },
                screenshotData:
                  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                isNew: false,
                isDeleted: false,
              },
            ],
          }),
          createDummyPost({
            comments: [
              {
                author: { name: "User", accountHref: "" },
                textContent: "Great video!",
                publishedAt: {
                  type: "absolute",
                  date: new Date().toISOString(),
                },
                screenshotData:
                  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                isNew: false,
                isDeleted: false,
              },
            ],
          }),
        ];

        const result = filterPosts(posts, "spam", emptyPostFilters);

        expect(result).toHaveLength(1);
        expect(result[0].comments[0].textContent).toContain("spam");
      });

      it("should be case-insensitive", () => {
        const posts = [
          createDummyPost({ title: "JavaScript Tutorial" }),
          createDummyPost({ title: "Python Guide" }),
        ];

        const resultLower = filterPosts(posts, "javascript", emptyPostFilters);
        const resultUpper = filterPosts(posts, "JAVASCRIPT", emptyPostFilters);
        const resultMixed = filterPosts(posts, "JaVaScRiPt", emptyPostFilters);

        expect(resultLower).toHaveLength(1);
        expect(resultUpper).toHaveLength(1);
        expect(resultMixed).toHaveLength(1);
      });

      it("should handle empty search term", () => {
        const posts = [
          createDummyPost({ title: "Post 1" }),
          createDummyPost({ title: "Post 2" }),
        ];

        const result = filterPosts(posts, "", emptyPostFilters);

        expect(result).toHaveLength(2);
      });

      it("should handle whitespace-only search term", () => {
        const posts = [
          createDummyPost({ title: "Post 1" }),
          createDummyPost({ title: "Post 2" }),
        ];

        const result = filterPosts(posts, "   ", emptyPostFilters);

        expect(result).toHaveLength(2);
      });

      it("should not match partial words", () => {
        const posts = [
          createDummyPost({ title: "JavaScript" }),
          createDummyPost({ title: "Python" }),
        ];

        const result = filterPosts(posts, "script", emptyPostFilters);

        expect(result).toHaveLength(1);
      });
    });

    describe("hateful comments filtering", () => {
      it("should filter posts with 0-10 hateful comments", () => {
        const posts = [
          createDummyPost({
            comments: [
              createHatefulComment("hateful 1"),
              createHatefulComment("hateful 2"),
            ],
          }),
          createDummyPost({
            comments: [
              createHatefulComment("hateful 1"),
              createHatefulComment("hateful 2"),
              createHatefulComment("hateful 3"),
              createHatefulComment("hateful 4"),
              createHatefulComment("hateful 5"),
              createHatefulComment("hateful 6"),
              createHatefulComment("hateful 7"),
              createHatefulComment("hateful 8"),
              createHatefulComment("hateful 9"),
              createHatefulComment("hateful 10"),
              createHatefulComment("hateful 11"),
            ],
          }),
          createDummyPost({ comments: [] }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [NbHatefulCommentsOptions.ZERO_TEN],
        };

        const result = filterPosts(posts, "", filters);

        expect(result).toHaveLength(1);
        expect(result[0].comments).toHaveLength(2);
      });

      it("should filter posts with 10-50 hateful comments", () => {
        const comments = Array.from({ length: 25 }, (_, i) =>
          createHatefulComment(`hateful ${i + 1}`),
        );
        const posts = [
          createDummyPost({
            comments: Array.from({ length: 5 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({ comments }),
          createDummyPost({
            comments: Array.from({ length: 60 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [NbHatefulCommentsOptions.TEN_FIFTY],
        };

        const result = filterPosts(posts, "", filters);

        expect(result).toHaveLength(1);
        expect(result[0].comments).toHaveLength(25);
      });

      it("should filter posts with 50+ hateful comments", () => {
        const posts = [
          createDummyPost({
            comments: Array.from({ length: 30 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({
            comments: Array.from({ length: 50 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({
            comments: Array.from({ length: 100 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [NbHatefulCommentsOptions.FIFTY_PLUS],
        };

        const result = filterPosts(posts, "", filters);

        expect(result).toHaveLength(2);
      });

      it("should handle multiple hateful comment ranges", () => {
        const posts = [
          createDummyPost({
            comments: Array.from({ length: 5 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({
            comments: Array.from({ length: 25 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({
            comments: Array.from({ length: 75 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [
            NbHatefulCommentsOptions.ZERO_TEN,
            NbHatefulCommentsOptions.FIFTY_PLUS,
          ],
        };

        const result = filterPosts(posts, "", filters);

        expect(result).toHaveLength(2);
      });

      it("should return all posts when no hateful comment filter is applied", () => {
        const posts = [
          createDummyPost({
            comments: Array.from({ length: 5 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({
            comments: Array.from({ length: 25 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [],
        };

        const result = filterPosts(posts, "", filters);

        expect(result).toHaveLength(2);
      });
    });

    describe("combined filtering", () => {
      it("should apply search term and hateful comments filters together", () => {
        const posts = [
          createDummyPost({
            title: "JavaScript Tutorial",
            comments: Array.from({ length: 5 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({
            title: "Python Guide",
            comments: Array.from({ length: 25 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
          createDummyPost({
            title: "JavaScript Advanced",
            comments: [],
          }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [NbHatefulCommentsOptions.ZERO_TEN],
        };

        const result = filterPosts(posts, "JavaScript", filters);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe("JavaScript Tutorial");
      });

      it("should return empty array when no posts match both filters", () => {
        const posts = [
          createDummyPost({
            title: "Python Guide",
            comments: Array.from({ length: 5 }, (_, i) =>
              createHatefulComment(`hateful ${i + 1}`),
            ),
          }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [NbHatefulCommentsOptions.FIFTY_PLUS],
        };

        const result = filterPosts(posts, "JavaScript", filters);

        expect(result).toHaveLength(0);
      });
    });

    describe("edge cases", () => {
      it("should handle empty posts array", () => {
        const result = filterPosts([], "search", emptyPostFilters);
        expect(result).toHaveLength(0);
      });

      it("should handle posts with empty comments array", () => {
        const posts = [createDummyPost({ comments: [] })];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [NbHatefulCommentsOptions.ZERO_TEN],
        };

        const result = filterPosts(posts, "", filters);

        expect(result).toHaveLength(0);
      });

      it("should only count hateful comments, not regular comments", () => {
        const posts = [
          createDummyPost({
            comments: [
              createHatefulComment("hateful comment"),
              {
                author: { name: "User", accountHref: "" },
                textContent: "Nice video!",
                publishedAt: {
                  type: "absolute",
                  date: new Date().toISOString(),
                },
                classification: ["Positive"],
                screenshotData:
                  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                isNew: false,
                isDeleted: false,
              },
            ],
          }),
        ];

        const filters: PostFilters = {
          ...emptyPostFilters,
          nbHatefulComments: [NbHatefulCommentsOptions.ZERO_TEN],
        };

        const result = filterPosts(posts, "", filters);

        expect(result).toHaveLength(1);
      });
    });
  });
});
