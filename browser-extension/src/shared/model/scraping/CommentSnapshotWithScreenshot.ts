import type { CommentSnapshot } from "../PostSnapshot";
import type { ScrapingScreenshots } from "./ScrapingScreenshots";

/**
 * Temporary structure used while a scraper extracts screenshots from comments.
 */
export type CommentSnapshotWithScreenshot = Omit<CommentSnapshot, "replies"> & {
  screenshotData: string;
  replies: CommentSnapshotWithScreenshot[];
};

export function detachCommentScreenshots(
  comments: CommentSnapshotWithScreenshot[],
): {
  screenshots: ScrapingScreenshots;
  comments: CommentSnapshot[];
} {
  const screenshots: ScrapingScreenshots = {};

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
