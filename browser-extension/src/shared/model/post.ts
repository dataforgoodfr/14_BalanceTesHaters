import { SocialNetworkName } from "./social-network-name";

export type Post = {
  /**
   * Unique id of post returned by backend after storage.
   * Not to be confused with postId which is the id of the post on the social network (e.g. youtube video id).
   */
  backendId: string;

  /**
   * Url of the post. E.g. youtube video url
   */
  url: string;

  /**
   * Publication date as a string.
   * Preferably an iso datetime.
   * If not possible a partial or relative date. e.g. "Jan 4" or "3 days ago"
   */
  publishedAt: string;

  /**
   * Timestamp of scrap - ISO datetime
   */
  scrapedAt: string;
  author: Author;

  /**
   * Content for text post or description of post for video posts
   */
  textContent?: string;
  comments: Comment[];

  /** Extra fields not yet in model.md but probaby usefull for app display*/

  /**
   * e.g. youtube video id
   */
  postId: string;
  socialNetwork: SocialNetworkName;
  title?: string;
};

export type Author = {
  name: string;
  accountHref: string;
};

export type Comment = {
  textContent: string;
  author: Author;
  /**
   * Publication date as a string.
   * Preferably an iso datetime.
   * If not possible a partial or relative date. e.g. "Jan 4" or "3 days ago"
   */
  publishedAt?: string;

  /**
   * Based 64 encoded PNG data
   */
  screenshotData: string;
  /**
   * Timestamp of scrap - ISO datetime
   */
  scrapedAt: string;

  replies: Comment[];

  classification?: string[];
  /** ISO date time of classification */
  classifiedAt?: string;
  nbLikes: number;
};
