import { build } from "wxt";
import { CommentSnapshot, PostSnapshot } from "../PostSnapshot";
import { id } from "date-fns/locale";

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
  comments: PostComment[];
};

export type PostComment = Pick<
  CommentSnapshot,
  | "commentId"
  | "author"
  | "publishedAt"
  | "textContent"
  | "classification"
  | "classifiedAt"
> & {
  replies: PostComment[];
  /**
   * True if comment was added in latest snapshot of post
   */
  isNew: boolean;
  /**
   * True if comment was deleted in a more recent snapshot of post
   */
  isDelete: boolean;
};
