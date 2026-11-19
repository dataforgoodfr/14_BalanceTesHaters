import type { ClassificationStatus } from "../ClassificationStatus";
import type { CommentSharedProperties } from "../CommentSharedPropertiesSchema";
import type { PostSharedProperties } from "../PostSharedProperties";
import type { CommentScreenshotRef } from "../CommentScreenshot";

/**
 * Merged view of Post Snapshot
 */
export type Post = PostSharedProperties & {
  /**
   * Flat list of all comments.
   * Built from PostSnapshot comments by deduping on comment id and consecutive same text content
   */
  comments: PostComment[];

  /**
   * Date of first PostSnapshot
   */
  firstAnalysisDate: string;

  /**
   * Number of PostSnapshot associated to this post
   */
  analysisCount: number;
  /**
   * Date of the latest snapshot on which this post is based.
   */
  latestAnalysisDate: string;

  latestAnalysisStatus?: ClassificationStatus;
};

export type PostWithFlags = Omit<Post, "comments"> & {
  /**
   * Equivalent of PostComment with added flag information
   */
  comments: PostCommentWithFlag[];
};

/**
 * A comment revision consolidating consecutive PostSnapshots with the same commentId and text.
 * TODO: rename to CommentRevision in separate PR.
 **/
export type PostComment = CommentSharedProperties & {
  /** Platform hosting the original comment. */
  socialNetwork: PostSharedProperties["socialNetwork"];
  /** ID of the parent post within that platform. */
  postId: string;

  /** Globally unique revision ID: postId:commentId:zero-based revision sequence. */
  commentRevisionId: string;

  /** Zero-based sequence of consecutive text revisions for this comment. */
  revision: number;

  /**
   * Screenshot selected as evidence for this consolidated comment.
   */
  screenshotRef?: CommentScreenshotRef;

  /**
   * True if comment was added in latest snapshot of post and more than one snapshot existed
   */
  isNew: boolean;
  /**
   * True if comment was deleted or replaced by a comment with different text
   */
  isDeleted: boolean;
};

export type PostCommentWithFlag = PostComment & {
  /**
   * True if this comment revision was flagged hateful
   */
  isFlagged: boolean;
};
