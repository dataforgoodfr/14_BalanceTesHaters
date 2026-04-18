import { Post } from "@/shared/model/post/Post";
import { isCommentHateful } from "@/shared/utils/post-util";

export type HateStats = {
  hatefulCommentsCount: number;
  hatersCount: number;
};

export function hateStats(post: Post): HateStats {
  const allComments = post.comments;
  const hatefullComments = allComments.filter(isCommentHateful);
  const hatefulCommentsCount = hatefullComments.length;
  const hatersCount = new Set(hatefullComments.map((c) => c.author.name)).size;
  return {
    hatersCount,
    hatefulCommentsCount,
  };
}
