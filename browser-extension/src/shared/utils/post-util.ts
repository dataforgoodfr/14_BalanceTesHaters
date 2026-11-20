import { AI_SCORE_HATE_THRESHOLD } from "../constants/ai-score-hate-threshold";
import type {
  Post,
  PostCommentWithFlag,
  PostWithFlags,
} from "../model/post/Post";
import type { PostSnapshot } from "../model/PostSnapshot";
import type { SocialNetworkName } from "../model/SocialNetworkName";
import { SocialNetwork } from "../model/SocialNetworkName";
import type { PublicationDate } from "../model/PublicationDate";

export enum NbHatefulCommentsOptions {
  ZERO_TEN = "0_10",
  TEN_FIFTY = "10_50",
  FIFTY_PLUS = "50+",
}

export enum DateFilterOptions {
  SEVEN_DAYS = "7days",
  THIRTY_DAYS = "30days",
  TWELVE_MONTHS = "12months",
}

export enum CommentDateFilterOptions {
  TODAY = "today",
  TWO_DAYS = "2days",
  SEVEN_DAYS = "7days",
  THIRTY_DAYS = "30days",
}

export enum CommentScoreFilterOptions {
  ABOVE_THRESHOLD = "aboveThreshold",
  AT_OR_BELOW_THRESHOLD = "atOrBelowThreshold",
  WITHOUT_SCORE = "withoutScore",
}

export enum CommentFlagFilterOptions {
  FLAGGED = "flagged",
  UNFLAGGED = "unflagged",
}

export enum PostSortingCategory {
  ANALYSIS_DATE_DESC = "analysisDateDesc",
  ANALYSIS_DATE_ASC = "analysisDateAsc",
  NB_HATEFUL_COMMENTS_DESC = "nbHatefulCommentsDesc",
  NB_HATEFUL_COMMENTS_ASC = "nbHatefulCommentsAsc",
  PUBLICATION_DATE_DESC = "publicationDateDesc",
  PUBLICATION_DATE_ASC = "publicationDateAsc",
}

export enum CommentSortingCategory {
  HATE_SCORE_ASC = "hateScoreAsc",
  HATE_SCORE_DESC = "hateScoreDesc",
  COMMENT_DATE_ASC = "commentDateAsc",
  COMMENT_DATE_DESC = "commentDateDesc",
  PSEUDO_AUTHOR_ASC = "pseudoAuthorAsc",
  PSEUDO_AUTHOR_DESC = "pseudoAuthorDesc",
}

export type PostFilters = {
  date: DateFilterOptions | undefined;
  nbHatefulComments: NbHatefulCommentsOptions[];

  score: string[];
  alert: string[];
  status: string[];
  containsCategory: string[];
  containsAuthor: string[];
};

export type CommentFilters = {
  date: CommentDateFilterOptions | undefined;
  score: CommentScoreFilterOptions[];
  flaggedStatus: CommentFlagFilterOptions[];
  alert: string[];
  category: string[];
  status: string[];
  pseudoAuthor: string[];
};

export const emptyPostFilters: PostFilters = {
  nbHatefulComments: [],
  date: undefined,
  score: [],
  alert: [],
  status: [],
  containsCategory: [],
  containsAuthor: [],
};

export const emptyCommentFilters: CommentFilters = {
  date: undefined,
  flaggedStatus: [],
  score: [],
  alert: [],
  status: [],
  pseudoAuthor: [],
  category: [],
};

export function isPostPublishedAfter(post: PostSnapshot, date: Date): boolean {
  switch (post.publishedAt.type) {
    case "absolute":
      return new Date(post.publishedAt.date) > date;
    case "relative":
      return new Date(post.publishedAt.resolvedDateRange.end) > date;
    case "unknown date":
      return true; // if we don't know the date, we always consider the comment as published after the given date (to avoid excluding it from analyses)
  }
}

export function isPostPublishedBefore(post: PostSnapshot, date: Date): boolean {
  switch (post.publishedAt.type) {
    case "absolute":
      return new Date(post.publishedAt.date) < date;
    case "relative":
      return new Date(post.publishedAt.resolvedDateRange.start) < date;
    case "unknown date":
      return true; // if we don't know the date, we always consider the comment as published after the given date (to avoid excluding it from analyses)
  }
}

export function getEarliestPostDate(postList: Post[] | undefined): Date {
  if (!postList || postList.length === 0) {
    return new Date();
  }

  return postList
    .map((post) => {
      switch (post.publishedAt.type) {
        case "absolute":
          return new Date(post.publishedAt.date);
        case "relative":
          return new Date(post.publishedAt.resolvedDateRange.start);
        case "unknown date":
          return undefined;
      }
    })
    .filter((date): date is Date => date !== undefined)
    .reduce((acc: Date, date) => {
      if (date < acc) {
        return date;
      }
      return acc;
    }, new Date());
}

export function formatAnalysisDate(isoDateTime: string): string {
  const date: string = new Date(isoDateTime).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time: string = new Date(isoDateTime).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} à ${time}`;
}

/**
 * Builds a post global unique identifier from ocialNetwork and postId
 * @param postId A
 * @param socialNetwork
 * @returns
 */
export function buildPostKey(
  postId: string,
  socialNetwork: SocialNetworkName,
): string {
  return `${socialNetwork}:${postId}`;
}

export function getSocialNetworkName(socialNetwork: SocialNetworkName): string {
  switch (socialNetwork) {
    case SocialNetwork.YouTube:
      return "YouTube";
    case SocialNetwork.Instagram:
      return "Instagram";
    default:
      return "";
  }
}

export function getPublicationTypeLabel(
  postUrl: string,
  socialNetwork: SocialNetworkName,
): string {
  try {
    const parsedUrl = new URL(postUrl);
    const pathname = parsedUrl.pathname.toLowerCase();

    if (socialNetwork === SocialNetwork.YouTube) {
      if (pathname.startsWith("/shorts/")) {
        return "Short";
      }
      if (pathname === "/watch" || pathname.startsWith("/watch/")) {
        return "Vidéo";
      }
      return "Publication";
    }

    if (socialNetwork === SocialNetwork.Instagram) {
      if (pathname.startsWith("/reel/") || pathname.startsWith("/reels/")) {
        return "Reel";
      }
      if (pathname.startsWith("/p/")) {
        return "Post (page ou modal)";
      }
      return "Publication";
    }
  } catch {
    return "Inconnu";
  }

  return "Publication";
}

export function filterPosts<T extends Post>(
  posts: T[],
  searchTerm: string,
  filters: PostFilters,
): T[] {
  let filteredPosts = posts;
  if (filters.nbHatefulComments) {
    filteredPosts = filteredPosts.filter((post) => {
      const postHatefulCommentsCount = post.comments.filter(
        (comment) => "isFlagged" in comment && comment.isFlagged === true,
      ).length;
      return (
        filters.nbHatefulComments.length == 0 ||
        (filters.nbHatefulComments.includes(
          NbHatefulCommentsOptions.ZERO_TEN,
        ) &&
          postHatefulCommentsCount > 0 &&
          postHatefulCommentsCount <= 10) ||
        (filters.nbHatefulComments.includes(
          NbHatefulCommentsOptions.TEN_FIFTY,
        ) &&
          postHatefulCommentsCount >= 10 &&
          postHatefulCommentsCount <= 50) ||
        (filters.nbHatefulComments.includes(
          NbHatefulCommentsOptions.FIFTY_PLUS,
        ) &&
          postHatefulCommentsCount >= 50)
      );
    });
  }

  // Lastly, apply search term filtering
  const searchValue = searchTerm.trim().toLowerCase();
  return filteredPosts.filter((post) => {
    const title = post.title?.toLowerCase() ?? "";
    const description = post.textContent?.toLowerCase() ?? "";
    const url = post.url?.toLowerCase() ?? "";
    const commentsContent = post.comments
      .map((c) => c.textContent.toLowerCase())
      .join(" ");
    return (
      title.includes(searchValue) ||
      description.includes(searchValue) ||
      url.includes(searchValue) ||
      commentsContent.includes(searchValue)
    );
  });
}

export function sortPostList(
  posts: PostWithFlags[],
  sortingCategory: PostSortingCategory,
): PostWithFlags[] {
  switch (sortingCategory) {
    case PostSortingCategory.ANALYSIS_DATE_ASC:
      return [...posts].sort(
        (a, b) =>
          new Date(a.latestAnalysisDate).getTime() -
          new Date(b.latestAnalysisDate).getTime(),
      );
    case PostSortingCategory.ANALYSIS_DATE_DESC:
      return [...posts].sort(
        (a, b) =>
          new Date(b.latestAnalysisDate).getTime() -
          new Date(a.latestAnalysisDate).getTime(),
      );
    case PostSortingCategory.NB_HATEFUL_COMMENTS_ASC:
      return [...posts].sort(
        (a, b) =>
          a.comments.filter((c) => c.isFlagged).length -
          b.comments.filter((c) => c.isFlagged).length,
      );
    case PostSortingCategory.NB_HATEFUL_COMMENTS_DESC:
      return [...posts].sort(
        (a, b) =>
          b.comments.filter((c) => c.isFlagged).length -
          a.comments.filter((c) => c.isFlagged).length,
      );
    case PostSortingCategory.PUBLICATION_DATE_ASC:
      return [...posts].sort((a, b) => {
        return (
          getDateForSorting(a.publishedAt).getTime() -
          getDateForSorting(b.publishedAt).getTime()
        );
      });
    case PostSortingCategory.PUBLICATION_DATE_DESC:
      return [...posts].sort((a, b) => {
        return (
          getDateForSorting(b.publishedAt).getTime() -
          getDateForSorting(a.publishedAt).getTime()
        );
      });
    default:
      return posts;
  }
}

export function filterCommentList(
  commentList: PostCommentWithFlag[],
  searchTerm: string,
  filters: CommentFilters,
): PostCommentWithFlag[] {
  let filteredCommentList = commentList;

  if (filters.date !== undefined) {
    const daysByPeriod: Record<CommentDateFilterOptions, number> = {
      [CommentDateFilterOptions.TODAY]: 1,
      [CommentDateFilterOptions.TWO_DAYS]: 2,
      [CommentDateFilterOptions.SEVEN_DAYS]: 7,
      [CommentDateFilterOptions.THIRTY_DAYS]: 30,
    };
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    startDate.setDate(startDate.getDate() - daysByPeriod[filters.date] + 1);

    filteredCommentList = filteredCommentList.filter(({ publishedAt }) => {
      switch (publishedAt.type) {
        case "absolute": {
          const date = new Date(publishedAt.date);
          return date >= startDate && date < endDate;
        }
        case "relative":
          return (
            new Date(publishedAt.resolvedDateRange.end) >= startDate &&
            new Date(publishedAt.resolvedDateRange.start) < endDate
          );
        case "unknown date":
          return false;
      }
    });
  }

  if (filters.pseudoAuthor && filters.pseudoAuthor.length > 0) {
    filteredCommentList = filteredCommentList.filter((comment) => {
      return filters.pseudoAuthor.includes(comment.author.name);
    });
  }

  if (filters.score.length > 0) {
    filteredCommentList = filteredCommentList.filter((comment) => {
      const scoreCategory =
        comment.hateScore === undefined
          ? CommentScoreFilterOptions.WITHOUT_SCORE
          : comment.hateScore > AI_SCORE_HATE_THRESHOLD
            ? CommentScoreFilterOptions.ABOVE_THRESHOLD
            : CommentScoreFilterOptions.AT_OR_BELOW_THRESHOLD;
      return filters.score.includes(scoreCategory);
    });
  }

  if (filters.flaggedStatus.length > 0) {
    filteredCommentList = filteredCommentList.filter((comment) =>
      filters.flaggedStatus.includes(
        comment.isFlagged
          ? CommentFlagFilterOptions.FLAGGED
          : CommentFlagFilterOptions.UNFLAGGED,
      ),
    );
  }

  // Lastly, apply search term filtering
  const searchValue = searchTerm.trim().toLowerCase();
  return filteredCommentList.filter((comment) => {
    const textContent = comment.textContent?.toLowerCase() ?? "";
    return (
      textContent.includes(searchValue) ||
      comment.author.name.toLowerCase().includes(searchValue)
    );
  });
}

export function sortCommentList(
  commentList: PostCommentWithFlag[],
  sortingCategory: CommentSortingCategory,
): PostCommentWithFlag[] {
  switch (sortingCategory) {
    case CommentSortingCategory.HATE_SCORE_ASC:
      return [...commentList].sort(
        (a, b) =>
          (a.hateScore ?? Number.POSITIVE_INFINITY) -
          (b.hateScore ?? Number.POSITIVE_INFINITY),
      );
    case CommentSortingCategory.HATE_SCORE_DESC:
      return [...commentList].sort(
        (a, b) =>
          (b.hateScore ?? Number.NEGATIVE_INFINITY) -
          (a.hateScore ?? Number.NEGATIVE_INFINITY),
      );
    case CommentSortingCategory.COMMENT_DATE_ASC:
      return [...commentList].sort((a, b) => {
        return (
          getDateForSorting(b.publishedAt).getTime() -
          getDateForSorting(a.publishedAt).getTime()
        );
      });
    case CommentSortingCategory.COMMENT_DATE_DESC:
      return [...commentList].sort((a, b) => {
        return (
          getDateForSorting(a.publishedAt).getTime() -
          getDateForSorting(b.publishedAt).getTime()
        );
      });
    case CommentSortingCategory.PSEUDO_AUTHOR_ASC:
      return [...commentList].sort((a, b) => {
        return a.author.name.localeCompare(b.author.name);
      });
    case CommentSortingCategory.PSEUDO_AUTHOR_DESC:
      return [...commentList].sort((a, b) => {
        return b.author.name.localeCompare(a.author.name);
      });
  }
}

function getDateForSorting(date: PublicationDate): Date {
  switch (date.type) {
    case "absolute":
      return new Date(date.date);
    case "relative":
      return new Date(date.resolvedDateRange.end);
    default:
      // earliest possible date
      return new Date(0);
  }
}
