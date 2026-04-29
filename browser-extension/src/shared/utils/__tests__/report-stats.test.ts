import { describe, expect, it } from "vitest";
import { PostComment } from "@/shared/model/post/Post";
import {
  getHatefulAuthorStatsList,
  getNumberOfHatefulAuthors,
} from "../report-stats";

const buildComment = (
  authorName: string,
  classification?: string[],
): PostComment => ({
  textContent: `${authorName} comment`,
  author: {
    name: authorName,
    accountHref: `https://example.com/${authorName.toLowerCase()}`,
  },
  publishedAt: {
    type: "absolute",
    date: "2026-01-01T00:00:00.000Z",
  },
  classification,
  screenshotData: "SGVsbG8=",
  isNew: false,
  isDeleted: false,
});

describe("report-stats", () => {
  it("should count unique hateful authors", () => {
    expect(
      getNumberOfHatefulAuthors([
        buildComment("Alice", ["Cyberharcèlement (autre)"]),
        buildComment("Alice", ["Cyberharcèlement (autre)"]),
        buildComment("Bob", ["Cyberharcèlement (autre)"]),
      ]),
    ).toBe(2);
  });

  it("should build sorted author stats limited to hateful authors", () => {
    expect(
      getHatefulAuthorStatsList([
        buildComment("Alice", ["Cyberharcèlement (autre)"]),
        buildComment("Alice", ["Neutre"]),
        buildComment("Bob", ["Cyberharcèlement (autre)"]),
        buildComment("Donald", ["Cyberharcèlement (autre)"]),
        buildComment("Donald", ["Cyberharcèlement (autre)"]),
        buildComment("Claire", ["Neutre"]),
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
