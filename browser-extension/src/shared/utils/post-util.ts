import { PostComment } from "../model/post/Post";
import { PostSnapshot } from "../model/PostSnapshot";

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
