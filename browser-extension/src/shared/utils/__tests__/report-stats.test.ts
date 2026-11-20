import type { PostCommentWithFlag } from "@/shared/model/post/Post";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { describe, expect, it } from "vitest";
import {
  getHatefulAuthorStatsList,
  getNumberOfHatefulAuthors,
} from "../report-stats";

const buildComment = (
  authorName: string,
  isFlagged: boolean,
): PostCommentWithFlag => ({
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
  commentId: "comment-1",
  revision: 0,
  isNew: false,
  isDeleted: false,
  commentRevisionId: "1",
  isFlagged,
  postId: "1",
  socialNetwork: SocialNetwork.YouTube,
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
