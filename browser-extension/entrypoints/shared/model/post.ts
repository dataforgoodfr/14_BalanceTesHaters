import { SocialNetworkName } from "./social-network-name";

export type Post = {
  scrapTimestamp: string;
  url: string;
  postId: string;
  socialNetwork: SocialNetworkName;
  author: Author;

  publishedAtRelative?: boolean;
  publishedAt?: string;
  title?: string;
  /**
   * Content or description of post
   */
  text?: string;
  comments: Comment[];
};

export type Author = {
  name: string;
  accountUrl?: string;
};

export type Comment = {
  author: Author;
  commentText: string;
  commentDate?: string;
  commentDateRelative?: boolean;
  screenshotDataUrl: string;
  screenshotDate: string;
  replies: Comment[];
};
