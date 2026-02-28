import { CommentSnapshot, PostSnapshot } from "../PostSnapshot";
/**
 * Merged view of Post Snapshot
 */
export type Post = Pick<
  PostSnapshot,
  | "socialNetwork"
  | "postId"
  | "url"
  | "publishedAt"
  | "author"
  | "title"
  | "coverImageUrl"
  | "textContent"
> & {
  // Flat list of all comments
  comments: PostComment[];
};

export type PostComment = Pick<
  CommentSnapshot,
  "author" | "publishedAt" | "textContent" | "classification" | "classifiedAt"
> & {
  commentSnapshotId: string;
  /**
   * True if comment was added in latest snapshot of post
   */
  isNew: boolean;
  /**
   * True if comment was deleted in a more recent snapshot of post
   */
  isDeleted: boolean;
};
