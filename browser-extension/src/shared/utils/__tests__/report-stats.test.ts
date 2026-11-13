import { describe, expect, it } from "vitest";
import {
  getHatefulAuthorStatsList,
  getNumberOfHatefulAuthors,
} from "../report-stats";
import type { PostCommentWithIdAndFlag } from "../post-util";

const buildComment = (
  authorName: string,
  isFlagged: boolean,
): PostCommentWithIdAndFlag => ({
  textContent: `${authorName} comment`,
  author: {
    name: authorName,
    accountHref: `https://example.com/${authorName.toLowerCase()}`,
  },
  publishedAt: {
    type: "absolute",
    date: "2026-01-01T00:00:00.000Z",
  },
  classification: [],
  isNew: false,
  isDeleted: false,
  id: "1",
  isFlagged,
  postId: "1",
  socialNetwork: "twitter",
  postKey: "1-twitter",
});

describe("report-stats", () => {
  it("should count unique hateful authors", () => {
    expect(
      getNumberOfHatefulAuthors([
        buildComment("Alice", true),
        buildComment("Alice", true),
        buildComment("Bob", true),
      ]),
    ).toBe(2);
  });

  it("should build sorted author stats limited to hateful authors", () => {
    expect(
      getHatefulAuthorStatsList([
        buildComment("Alice", true),
        buildComment("Alice", false),
        buildComment("Bob", true),
        buildComment("Donald", true),
        buildComment("Donald", true),
        buildComment("Claire", false),
      ]),
    ).toEqual([
      {
        authorName: "Donald",
        commentsCount: 2,
        hatefulCommentsCount: 2,
        hateContributionPercentage: 50,
      },
      {
        authorName: "Alice",
        commentsCount: 2,
        hatefulCommentsCount: 1,
        hateContributionPercentage: 25,
      },
      {
        authorName: "Bob",
        commentsCount: 1,
        hatefulCommentsCount: 1,
        hateContributionPercentage: 25,
      },
    ]);
  });
});
