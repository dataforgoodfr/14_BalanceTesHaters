import { z } from "zod";

const RelativeDateSchema = z.object({
  type: z.literal("relative"),
  dateText: z.string(),
  resolvedDateRange: z.object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  }),
});
const AbsoluteDateSchema = z.object({
  type: z.literal("absolute"),
  date: z.iso.datetime(),
});
/**
 * Publication date can be absolute, relative or unknown
 * absolute publication date is not always available in the frontend
 * (e.g. Youtube gives relative date "3 months ago")
 */
export const PublicationDateSchema = z.discriminatedUnion("type", [
  RelativeDateSchema,
  AbsoluteDateSchema,
  z.object({
    type: z.literal("unknown date"),
    dateText: z.string(),
  }),
]);
export type AbsoluteDate = z.infer<typeof AbsoluteDateSchema>;

export type RelativeDate = z.infer<typeof RelativeDateSchema>;
export type PublicationDate = z.infer<typeof PublicationDateSchema>;

// SocialNetworkName Schema
export const SocialNetworkNameSchema = z.enum(["YOUTUBE", "INSTAGRAM"]);
export type SocialNetworkName = z.infer<typeof SocialNetworkNameSchema>;

// ClassificationStatus Schema
export const ClassificationStatusSchema = z.enum([
  "SUBMITTED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
]);
export type ClassificationStatus = z.infer<typeof ClassificationStatusSchema>;

// Author Schema
export const AuthorSchema = z.object({
  name: z.string(),
  accountHref: z.string(),
});
export type Author = z.infer<typeof AuthorSchema>;

// Comment Schema (recursive - using Zod's recursive schema pattern)
export const CommentSchema = z.object({
  /**
   * Scraping comment unique id.
   * Note that this id is different from one scraping to another
   * and so cannot be used to correlated Comments between scrapings.
   */
  id: z.uuid(),

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
    return CommentSchema.array();
  },
  nbLikes: z.int(),

  classification: z.string().array().optional(),
  /** ISO date time of classification */
  classifiedAt: z.iso.datetime().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

// Post Schema
export const PostSchema = z.object({
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
  scrapedAt: z.string(),
  author: AuthorSchema,

  /**
   * Content for text post or description of post for video posts
   */
  textContent: z.string().optional(),
  comments: CommentSchema.array(),

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

export type Post = z.infer<typeof PostSchema>;

export function isRunningClassificationStatus(
  status: ClassificationStatus,
): boolean {
  return status === "SUBMITTED" || status === "IN_PROGRESS";
}
