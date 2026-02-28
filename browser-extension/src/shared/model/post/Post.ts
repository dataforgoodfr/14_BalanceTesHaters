import { CommentSharedProperties } from "../CommentSharedPropertiesSchema";
import { PostSharedProperties } from "../PostSharedProperties";

/**
 * Merged view of Post Snapshot
 */
export type Post = PostSharedProperties & {
  /**
   * Flat list of all comments.
   * Built from PostSnapshot comments by deduping on comment id and consecutive same text content
   */
  comments: PostComment[];
};

export type PostComment = CommentSharedProperties & {
  /**
   * True if comment was added in latest snapshot of post and more than one snapshot existed
   */
  isNew: boolean;
  /**
   * True if comment was deleted or replaced by a comment with different text
   */
  isDeleted: boolean;
};
