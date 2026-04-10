import { Post, PostComment } from "../model/post/Post";
import { PostSnapshot } from "../model/PostSnapshot";
import { SocialNetwork, SocialNetworkName } from "../model/SocialNetworkName";

export function isCommentHateful(comment: PostComment): boolean {
  return comment.classification?.[0] === "Cyberharcèlement (autre)";
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
