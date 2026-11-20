import type { PostCommentWithFlag } from "@/shared/model/post/Post";
import { commentScreenshotRefKey } from "@/shared/model/CommentScreenshot";

export type ReportScreenshotData = ReadonlyMap<string, string>;

export function getReportCommentScreenshot(
  comment: PostCommentWithFlag,
  screenshots: ReportScreenshotData,
): string | undefined {
  return comment.screenshotRef
    ? screenshots.get(commentScreenshotRefKey(comment.screenshotRef))
    : undefined;
}
