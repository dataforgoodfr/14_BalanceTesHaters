import { commentScreenshotRefKey } from "@/shared/model/CommentScreenshot";
import type { PostCommentWithId } from "@/shared/utils/post-util";

export type ReportScreenshotData = ReadonlyMap<string, string>;

export function getReportCommentScreenshot(
  comment: PostCommentWithId,
  screenshots: ReportScreenshotData,
): string | undefined {
  return comment.screenshotRef
    ? screenshots.get(commentScreenshotRefKey(comment.screenshotRef))
    : undefined;
}
