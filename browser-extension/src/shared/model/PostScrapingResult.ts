import type { CommentSnapshot, PostSnapshot } from "./PostSnapshot";

export type PostScrapingResult = {
  postSnapshot: PostSnapshot;
  screenshots: Record<CommentSnapshot["id"], string>;
};

/**
 * This type is a temporary datastructure used until scraper natively split screenshots and comments.
 */
export type CommentSnapshotWithScreenshot = Omit<CommentSnapshot, "replies"> & {
  screenshotData: string;
  replies: CommentSnapshotWithScreenshot[];
};

export function detachCommentScreenshots(
  comments: CommentSnapshotWithScreenshot[],
): {
  screenshots: PostScrapingResult["screenshots"];
  comments: CommentSnapshot[];
} {
  const screenshots: Record<CommentSnapshot["id"], string> = {};

  const detach = (comment: CommentSnapshotWithScreenshot): CommentSnapshot => {
    const { screenshotData, replies, ...snapshot } = comment;
    if (screenshotData) {
      screenshots[comment.id] = screenshotData;
    }
    return {
      ...snapshot,
      replies: replies.map(detach),
    };
  };

  return {
    comments: comments.map(detach),
    screenshots,
  };
}
