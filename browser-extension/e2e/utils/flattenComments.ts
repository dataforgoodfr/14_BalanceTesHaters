import { CommentSnapshot } from "@/shared/model/PostSnapshot";

export function flattenComments(
  comments: CommentSnapshot[],
): CommentSnapshot[] {
  return [...comments, ...comments.flatMap((c) => flattenComments(c.replies))];
}
