import { getPercentage } from "@/shared/utils/maths";
import { PostComment } from "@/shared/model/post/Post";
import { isCommentHateful } from "@/shared/utils/post-util";

export type HatefulAuthorStats = {
  /**
   * Author Name
   */
  authorName: string;
  /**
   * Author comments count
   */
  commentsCount: number;
  /**
   * * Author hateful comments count
   */
  hatefulCommentsCount: number;
  /**
   * Percentage of contribution of this author to all hateful comments.
   * 100% means author is the only one contributing hate comments.
   */
  hateContributionPercentage: number;
};

export const getNumberOfHatefulAuthors = (
  hatefulCommentList: readonly PostComment[],
) => new Set(hatefulCommentList.map((comment) => comment.author.name)).size;

export const getHatefulAuthorStatsList = (
  postComments: readonly PostComment[],
  maxAuthors: number | undefined = undefined,
): HatefulAuthorStats[] => {
  const commentsByAuthor = Object.groupBy(postComments, (c) => c.author.name);
  const allHatefulCommentsCount = postComments.filter(isCommentHateful).length;
  const stats = Object.entries(commentsByAuthor)
    .map(([authorName, authorComments]) => {
      const authorCommentsCount = (authorComments || []).length;
      const authorHatefulCommentsCount = (authorComments || []).filter(
        isCommentHateful,
      ).length;
      return {
        authorName: authorName,
        commentsCount: authorCommentsCount,
        hatefulCommentsCount: authorHatefulCommentsCount,
        hateContributionPercentage: getPercentage(
          authorHatefulCommentsCount,
          allHatefulCommentsCount,
        ),
      };
    })
    // Keep only authors with hatefull comments
    .filter((st) => st.hatefulCommentsCount >= 1)
    .sort((a, b) => {
      // Sort First by by hateful comments descending (waiting for score based sorting)
      const commentCountCompare =
        a.hatefulCommentsCount - b.hatefulCommentsCount;
      if (commentCountCompare !== 0) {
        return -commentCountCompare;
      }
      // and by author name ascending for ties for predictability
      return a.authorName.localeCompare(b.authorName);
    });

  if (maxAuthors === undefined) {
    return stats;
  } else {
    return stats.slice(0, maxAuthors);
  }
};
