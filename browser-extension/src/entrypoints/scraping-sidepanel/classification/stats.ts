import { AI_SCORE_HATE_THRESHOLD } from "@/shared/constants/ai-score-hate-threshold";
import type { Post } from "@/shared/model/post/Post";

export type HateStats = {
  hatefulCommentsCount: number;
  hatersCount: number;
};

export function hateStats(post: Post): HateStats {
  const allComments = post.comments;
  const hatefullComments = allComments.filter(
    (c) => c.hateScore && c.hateScore > AI_SCORE_HATE_THRESHOLD,
  );
  const hatefulCommentsCount = hatefullComments.length;
  const hatersCount = new Set(hatefullComments.map((c) => c.author.name)).size;
  return {
    hatersCount,
    hatefulCommentsCount,
  };
}
