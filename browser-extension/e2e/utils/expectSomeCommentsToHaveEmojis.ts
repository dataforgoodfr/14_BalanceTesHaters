import { CommentSnapshot } from "@/shared/model/PostSnapshot";
import { expect } from "@playwright/test";

export function expectSomeCommentsToHaveEmojis(comments: CommentSnapshot[]) {
  expect(
    comments.some((c) => /\p{Extended_Pictographic}/u.test(c.textContent)),
    "Some comments should have an emojis",
  ).toBeTruthy();
}
