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

export type PostComment = CommentSharedProperties & {
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
