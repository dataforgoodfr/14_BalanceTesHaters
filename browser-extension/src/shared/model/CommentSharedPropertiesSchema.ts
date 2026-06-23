import z from "zod";
import { AuthorSchema } from "./Author";
import { PublicationDateSchema } from "./PublicationDate";
import { AnnotatedCategorySchema } from "./AnnotatedCategory";

export const CommentSharedPropertiesSchema = z.object({
  textContent: z.string(),
  author: AuthorSchema,
  /**
   * Publication date as a string.
   * Preferably an iso datetime.
   * If not possible a partial or relative date. e.g. "Jan 4" or "3 days ago"
   */
  publishedAt: PublicationDateSchema,

  classification: AnnotatedCategorySchema.array().optional(),
  /** ISO date time of classification */
  classifiedAt: z.iso.datetime().optional(),

  screenshotData: z.base64(),

  /**
   * Permalink URL of the comment on the social network.
   * E.g. https://www.youtube.com/watch?v=VIDEO_ID&lc=COMMENT_ID
   */
  url: z.url().optional(),
});

export type CommentSharedProperties = z.infer<
  typeof CommentSharedPropertiesSchema
>;
