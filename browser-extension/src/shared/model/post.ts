import { SocialNetworkName } from "./social-network-name";

/**
 * Publication date can be absolute, relative or unknown
 * absolute publication date is not always available in the frontend
 * (e.g. Youtube gives relative date "3 months ago")
 */
export type PublicationDate =
  | {
      type: "relative";
      dateText: string; // "il y a 3 mois"
      resolvedDateRange: {
        start: Date; // "2026-02-05T00:00:00Z",
        end: Date; // "2026-02-05T23:59:59Z"
      };
    }
  | {
      type: "absolute";
      date: Date; // ISO date
    }
  | {
      type: "unknown date";
      dateText: string; // "42 vendémiaire MMXXVI"
    };

export type Post = {
  url: string;
  publishedAt: PublicationDate;

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
  publishedAt?: PublicationDate;

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
