import { z } from "zod";
import { PublicationDateSchema } from "./PublicationDate";
import { SocialNetworkNameSchema } from "./SocialNetworkName";
import { AuthorSchema } from "./Author";
import { ClassificationStatusSchema } from "./ClassificationStatus";
import { CommentSnapshot } from "./PostSnapshot";

export const CommentSnapshotSchema = z.object({
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

  textContent: z.string(),
  author: AuthorSchema,
  /**
   * Publication date as a string.
   * Preferably an iso datetime.
   * If not possible a partial or relative date. e.g. "Jan 4" or "3 days ago"
   */
  publishedAt: PublicationDateSchema,

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

  classification: z.string().array().optional(),
  /** ISO date time of classification */
  classifiedAt: z.iso.datetime().optional(),
});

export type CommentSnapshot = z.infer<typeof CommentSnapshotSchema>;

export const PostSnapshotSchema = z.object({
  /**
   * A unique identifier for this snapshot.
   */
  id: z.uuid(),

  /**
   * Url of the post. E.g. youtube video url
   */
  url: z.string(),

  /**
   * Publication date as a string.
   * Preferably an iso datetime.
   * If not possible a partial or relative date. e.g. "Jan 4" or "3 days ago"
   */
  publishedAt: PublicationDateSchema,

  /**
   * Timestamp of scrap - ISO datetime
   */
  scrapedAt: z.iso.datetime(),
  author: AuthorSchema,

  /**
   * Content for text post or description of post for video posts
   */
  textContent: z.string().optional(),

  /**
   * Main image allowing to identify the  post:
   * e.g. Post cover image url for video/reel, the photo for a photo posts
   */
  coverImageUrl: z.url().optional(),

  comments: CommentSnapshotSchema.array(),

  /**
   * e.g. youtube video id
   */
  postId: z.string(),
  socialNetwork: SocialNetworkNameSchema,
  title: z.string().optional(),

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
