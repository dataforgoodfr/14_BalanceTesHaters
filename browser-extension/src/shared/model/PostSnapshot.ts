import { z } from "zod";
import { ClassificationStatusSchema } from "./ClassificationStatus";
import { PostSharedPropertiesSchema } from "./PostSharedProperties";
import { CommentSharedPropertiesSchema } from "./CommentSharedPropertiesSchema";

const NonRecursiveCommentSnapshotSchema = CommentSharedPropertiesSchema.extend({
  /**
   * Comment snapshot unique id.
   * Note that this id is different from one scraping to another
   * and so cannot be used to correlated Comments between scrapings.
   */
  id: z.uuid(),

  /**
   * An id allowing to correlate the same comment across snapshots of the social network post.
   * Ideally this should be the id of the comment on the social network platform.
   */
  commentId: z.string().optional(),

  /**
   * Based 64 encoded PNG data
   */
  screenshotData: z.base64(),
  /**
   * Timestamp of scrap - ISO datetime
   */
  scrapedAt: z.iso.datetime(),

  nbLikes: z.int(),
}).refine(
  (val) => val.commentId != undefined || val.publishedAt.type === "absolute",
  {
    error: "Comment need either a commentId or an absolute date",
  },
);

// Use an intermediate CommentWithoutRepliesSchema Zod Schema to avoid typescript error
// "replies' implicitly has return type 'any' because it does not have a return type annotation
// and is referenced directly or indirectly in one of its return expressions. "
// When combining refine and recursive schema
export const CommentSnapshotSchema = NonRecursiveCommentSnapshotSchema.extend({
  get replies() {
    return CommentSnapshotSchema.array();
  },
});

export type CommentSnapshot = z.infer<typeof CommentSnapshotSchema>;

export const PostSnapshotSchema = PostSharedPropertiesSchema.extend({
  /**
   * A unique identifier for this snapshot.
   */
  id: z.uuid(),

  /**
   * Timestamp of scrap - ISO datetime
   */
  scrapedAt: z.iso.datetime(),

  /**
   * Comment snapshots
   */
  comments: CommentSnapshotSchema.array(),

  /**
   * Classification job id returned by backend after storage.
   * Not to be confused with postId which is the id of the post on the social network (e.g. youtube video id).
   */
  classificationJobId: z.string().optional(),
  classificationStatus: ClassificationStatusSchema.optional(),
});

/**
 * A post snapshot represents a social network post scraped as scraped at a given date
 */
export type PostSnapshot = z.infer<typeof PostSnapshotSchema>;

/**
 * Flatten comments hierarchy into a single list
 * @param comments
 * @returns
 */
export function flattenCommentsSnapshotReplies(
  comments: CommentSnapshot[],
): CommentSnapshot[] {
  return comments.flatMap((c) => [
    c,
    ...flattenCommentsSnapshotReplies(c.replies),
  ]);
}
