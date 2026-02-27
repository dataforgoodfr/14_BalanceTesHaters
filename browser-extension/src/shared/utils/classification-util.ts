import { CommentSnapshot } from "../model/PostSnapshot";

export function IsCommentHateful(comment: CommentSnapshot): boolean {
  return (comment.classification?.length ?? 0) > 0;
}
