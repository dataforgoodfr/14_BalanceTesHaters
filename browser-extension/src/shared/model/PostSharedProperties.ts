import z from "zod";
import { PublicationDateSchema } from "./PublicationDate";
import { AuthorSchema } from "./Author";
import { SocialNetworkNameSchema } from "./SocialNetworkName";

/**
 * Properties Shared between Post and PostSnapshot
 */
export const PostSharedPropertiesSchema = z.object({
  /**
   * e.g. youtube video id
   */
  postId: z.string(),
  socialNetwork: SocialNetworkNameSchema,

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

  title: z.string().optional(),
});

export type PostSharedProperties = z.infer<typeof PostSharedPropertiesSchema>;
