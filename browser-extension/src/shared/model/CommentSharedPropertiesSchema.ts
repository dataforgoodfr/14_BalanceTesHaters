import z from "zod";
import { AuthorSchema } from "./Author";
import { PublicationDateSchema } from "./PublicationDate";

export const CommentSharedPropertiesSchema = z.object({
  textContent: z.string(),
  author: AuthorSchema,
  /**
   * Publication date as a string.
   * Preferably an iso datetime.
   * If not possible a partial or relative date. e.g. "Jan 4" or "3 days ago"
   */
  publishedAt: PublicationDateSchema,

  classification: z.string().array().optional(),
  /** ISO date time of classification */
  classifiedAt: z.iso.datetime().optional(),
});

export type CommentSharedProperties = z.infer<
  typeof CommentSharedPropertiesSchema
>;
