import { z } from "zod";
import { ClassificationStatusSchema } from "./ClassificationStatus";
import { PostSharedPropertiesSchema } from "./PostSharedProperties";
import { CommentSharedPropertiesSchema } from "./CommentSharedPropertiesSchema";

export const CommentSnapshotSchema = CommentSharedPropertiesSchema.extend({
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

  get replies() {
    return CommentSnapshotSchema.array();
  },
  nbLikes: z.int(),
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
