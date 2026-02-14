import { SocialNetworkName } from "./social-network-name";

export type UUID = ReturnType<typeof crypto.randomUUID>;
export type Post = {
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

  /**
   * e.g. youtube video id
   */
  postId: string;
  socialNetwork: SocialNetworkName;
  title?: string;

  /**
   * Classification job id returned by backend after storage.
   * Not to be confused with postId which is the id of the post on the social network (e.g. youtube video id).
   */
  classificationJobId?: string;
  classificationStatus?: ClassificationStatus;
};

export function isRunningClassificationStatus(
  status: ClassificationStatus,
): boolean {
  return status === "SUBMITTED" || status === "IN_PROGRESS";
}

export type ClassificationStatus =
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export type Author = {
  name: string;
  accountHref: string;
};

export type Comment = {
  /**
   * Scraping comment unique id.
   * Note that this id is different from one scraping to another
   * and so cannot be used to correlated Comments between scrapings.
   */
  id: UUID;

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
  nbLikes: number;

  classification?: string[];
  /** ISO date time of classification */
  classifiedAt?: string;
};
