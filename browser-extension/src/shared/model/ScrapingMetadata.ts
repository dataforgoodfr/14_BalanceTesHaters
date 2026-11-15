import { z } from "zod";

export const ScrapingMetadataSchema = z.object({
  /** Count displayed by the social network; it may be approximate. */
  expectedCommentsCount: z.int().nonnegative(),
  commentsLimit: z.int().positive(),
  /** Whether scraping stopped because the retained comment count reached the cap. */
  limitReached: z.boolean(),
  /** Observed exclusions, including replies and comments represented by placeholders. */
  filteredCommentsCount: z.int().nonnegative(),
  /** Post extraction time, including screenshots, before storage and classification. */
  durationMs: z.int().nonnegative(),
  screenshotsEnabled: z.boolean(),
});

export type ScrapingMetadata = z.infer<typeof ScrapingMetadataSchema>;
