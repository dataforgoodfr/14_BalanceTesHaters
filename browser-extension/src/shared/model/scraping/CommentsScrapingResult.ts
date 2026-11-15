import type { CommentSnapshot } from "../PostSnapshot";
import type { ScrapingMetadata } from "../ScrapingMetadata";

export type CommentsScrapingResult = {
  comments: CommentSnapshot[];
  metadata: Omit<ScrapingMetadata, "durationMs">;
};
