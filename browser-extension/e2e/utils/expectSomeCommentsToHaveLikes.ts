import { CommentSnapshot } from "@/shared/model/PostSnapshot";
import { expect } from "@playwright/test";

export function expectSomeCommentsToHaveLikes(comments: CommentSnapshot[]) {
  expect(
    comments.some((comment) => comment.nbLikes > 0),
    "Some comments should have likes",
  ).toBe(true);
}
