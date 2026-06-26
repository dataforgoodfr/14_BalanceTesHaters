import { PostCommentWithId } from "@/entrypoints/posts/Posts/CommentsTable";
import { isCategoryHateful } from "../model/AnnotatedCategory";
import { Post, PostComment } from "../model/post/Post";
import { PostSnapshot } from "../model/PostSnapshot";
import { SocialNetwork, SocialNetworkName } from "../model/SocialNetworkName";
import { PublicationDate } from "../model/PublicationDate";

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

export enum PostSortingCategory {
  ANALYSIS_DATE_DESC = "analysisDateDesc",
  ANALYSIS_DATE_ASC = "analysisDateAsc",
  NB_HATEFUL_COMMENTS_DESC = "nbHatefulCommentsDesc",
  NB_HATEFUL_COMMENTS_ASC = "nbHatefulCommentsAsc",
  PUBLICATION_DATE_DESC = "publicationDateDesc",
  PUBLICATION_DATE_ASC = "publicationDateAsc",
}

export enum CommentSortingCategory {
  SCORE_ASC = "scoreAsc",
  SCORE_DESC = "scoreDesc",
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
  date: DateFilterOptions | undefined;
  score: string[];
  alert: string[];
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
  score: [],
  alert: [],
  status: [],
  pseudoAuthor: [],
};

export function isCommentHateful(comment: PostComment): boolean {
  return (comment.classification || []).some((category) =>
    isCategoryHateful(category),
  );
}

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

export function buildPostKey(
  postId: string,
  socialNetwork: SocialNetworkName,
): string {
  return `${postId}|${socialNetwork}`;
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

export function filterPosts(
  posts: Post[],
  searchTerm: string,
  filters: PostFilters,
): Post[] {
  let filteredPosts = posts;
  if (filters.nbHatefulComments) {
    filteredPosts = filteredPosts.filter((post) => {
      const postHatefulCommentsCount =
        post.comments.filter(isCommentHateful).length;
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
  posts: Post[],
  sortingCategory: PostSortingCategory,
): Post[] {
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
          a.comments.filter(isCommentHateful).length -
          b.comments.filter(isCommentHateful).length,
      );
    case PostSortingCategory.NB_HATEFUL_COMMENTS_DESC:
      return [...posts].sort(
        (a, b) =>
          b.comments.filter(isCommentHateful).length -
          a.comments.filter(isCommentHateful).length,
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
  }
}

export function filterCommentList(
  commentList: PostCommentWithId[],
  searchTerm: string,
  filters: CommentFilters,
): PostCommentWithId[] {
  let filteredCommentList = commentList;

  if (filters.pseudoAuthor && filters.pseudoAuthor.length > 0) {
    filteredCommentList = filteredCommentList.filter((comment) => {
      const pseudoAuthor = comment.author.name;
      return filters.pseudoAuthor.some((filterValue) =>
        pseudoAuthor.includes(filterValue),
      );
    });
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
  commentList: PostCommentWithId[],
  sortingCategory: CommentSortingCategory,
): PostCommentWithId[] {
  switch (sortingCategory) {
    case CommentSortingCategory.SCORE_ASC:
    case CommentSortingCategory.SCORE_DESC:
      // Score is not yet available
      return commentList;
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
