import { CommentSnapshot } from "@/shared/model/PostSnapshot";
import { expect } from "@playwright/test";

export function expectCommentsToMatchInvariants(comments: CommentSnapshot[]) {
  expect(
    comments.every((comment) => comment.commentId !== null),
    "All comments should have a commentId",
  ).toBe(true);

  // Test comments have text
  expect(
    comments.every((comment) => comment.textContent.length > 0),
    "Comments should have text",
  ).toBe(true);

  expect(
    comments.every((comment) => comment.screenshotData.length > 0),
    "Comments should have screenshot data",
  ).toBe(true);

  expect(
    comments.every((comment) => comment.author.name.length > 0),
    "Comments should have author name",
  ).toBe(true);

  expect(
    comments.every((comment) => comment.author.accountHref.length > 0),
    "Comments should have author href",
  ).toBe(true);
}
