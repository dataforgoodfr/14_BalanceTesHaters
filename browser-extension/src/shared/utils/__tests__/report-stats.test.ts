import { describe, expect, it } from "vitest";
import { PostComment } from "@/shared/model/post/Post";
import { getAuthorStatsList, getNumberOfHatefulAuthors } from "../report-stats";

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
      getAuthorStatsList([
        buildComment("Alice", ["Cyberharcèlement (autre)"]),
        buildComment("Alice", ["Neutre"]),
        buildComment("Bob", ["Cyberharcèlement (autre)"]),
        buildComment("Claire", ["Neutre"]),
      ]),
    ).toEqual([
      {
        name: "Bob",
        numberOfComments: 1,
        numberOfHatefulComments: 1,
      },
      {
        name: "Alice",
        numberOfComments: 2,
        numberOfHatefulComments: 1,
      },
    ]);
  });
});
