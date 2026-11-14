import type { Post } from "@/shared/model/post/Post";

// A mettre à jour avec la possibilité de paramétrer le seuil de malveillance (hateScore) pour considérer un commentaire comme haineux
export const LIMIT_HATE_SCORE = 0.8;

export type HateStats = {
  hatefulCommentsCount: number;
  hatersCount: number;
};

export function hateStats(post: Post): HateStats {
  const allComments = post.comments;
  const hatefullComments = allComments.filter(
    (c) => c.hateScore && c.hateScore > LIMIT_HATE_SCORE,
  );
  const hatefulCommentsCount = hatefullComments.length;
  const hatersCount = new Set(hatefullComments.map((c) => c.author.name)).size;
  return {
    hatersCount,
    hatefulCommentsCount,
  };
}
