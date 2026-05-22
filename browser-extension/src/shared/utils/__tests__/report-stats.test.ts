import { describe, expect, it } from "vitest";
import { PostComment } from "@/shared/model/post/Post";
import {
  getHatefulAuthorStatsList,
  getNumberOfHatefulAuthors,
} from "../report-stats";
import { AnnotatedCategory } from "@/shared/model/AnnotatedCategory";

const buildComment = (
  authorName: string,
  classification?: AnnotatedCategory[],
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
        buildComment("Alice", [
          AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        ]),
        buildComment("Alice", [
          AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        ]),
        buildComment("Bob", [
          AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        ]),
      ]),
    ).toBe(2);
  });

  it("should build sorted author stats limited to hateful authors", () => {
    expect(
      getHatefulAuthorStatsList([
        buildComment("Alice", [
          AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        ]),
        buildComment("Alice", [AnnotatedCategory.ABSENCE_DE_CYBERHARCELEMENT]),
        buildComment("Bob", [
          AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        ]),
        buildComment("Donald", [
          AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        ]),
        buildComment("Donald", [
          AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        ]),
        buildComment("Claire", [AnnotatedCategory.ABSENCE_DE_CYBERHARCELEMENT]),
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
