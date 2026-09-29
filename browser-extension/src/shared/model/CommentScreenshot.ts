import type { CommentSnapshot, PostSnapshot } from "./PostSnapshot";

export type CommentScreenshotRef = {
  postSnapshotId: PostSnapshot["id"];
  commentSnapshotId: CommentSnapshot["id"];
};

export function commentScreenshotRefKey(ref: CommentScreenshotRef): string {
  return `${ref.postSnapshotId}:${ref.commentSnapshotId}`;
}
