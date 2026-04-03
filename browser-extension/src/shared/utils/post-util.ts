import { PostComment } from "../model/post/Post";
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