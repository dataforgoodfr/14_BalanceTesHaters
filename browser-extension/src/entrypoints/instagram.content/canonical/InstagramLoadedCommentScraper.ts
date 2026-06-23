import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { Author } from "@/shared/model/Author";
import { ElementScreenshotProvider } from "@/shared/screenshoting";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";
import {
  FB_COMMENTS_TEXT_REGEX,
  LIKES_BUTTON_REGEX,
} from "./instagramElementsTexts";
import { imageToPngBase64 } from "@/shared/screenshoting/";

export class InstagramLoadedCommentScraper {
  constructor(
    private readonly commentElement: HTMLElement,
    private readonly screenshotProvider: ElementScreenshotProvider,
    private readonly scrapingSupport: ScrapingSupport,
  ) {}

  async scrapLoadedComment(): Promise<InstagramComment> {
    if (this.isFacebookCommentsPlaceholder()) {
      return {
        type: "fb-comments",
        data: undefined,
      };
    }
    const id = crypto.randomUUID();
    const scrapedAt = currentIsoDate();
    const screenshotImage =
      await this.screenshotProvider.buildElementScreenshot(this.commentElement);
    const screenshotData = imageToPngBase64(screenshotImage);

    // digg into comment structure to exclude :
    //  - author profile picture
    //  - like button on the right
    const commentCentralDiv = this.scrapingSupport.selectOrThrow(
      this.commentElement,
      ":scope > div > div:nth-of-type(2) > div:nth-of-type(1)",
      HTMLElement,
      {
        parentElementDescriptor: "commentElement",
        selectedElementDescriptor: "commentCentralDiv",
      },
    );

    const author = this.scrapAuthor(commentCentralDiv);
    const nbLikes = this.scrapNbLikes(commentCentralDiv);

    const commentImageElement = this.scrapingSupport.select(
      commentCentralDiv,
      ":scope img",
      HTMLImageElement,
    );
    if (commentImageElement) {
      // Image comment
      // Does not contain comment id or publication date
      return {
        type: "image",
        data: {
          id,
          scrapedAt,
          nbLikes,
          author,
          imageSrc: commentImageElement.src,
          screenshotData,
        },
      };
    } else {
      // Text content
      const commentHref = this.scrapCommentHref(commentCentralDiv);
      const commentId = extractCommentIdFromInstagramCommentHref(commentHref);

      const publishedAt: PublicationDate =
        this.scrapPublishedAt(commentCentralDiv);
      const textContent = this.scrapTextContent(commentCentralDiv);

      return {
        type: "text",
        data: {
          id,
          scrapedAt,
          commentId,
          url: commentHref,
          nbLikes,
          author,
          textContent,
          publishedAt,
          screenshotData,
        },
      };
    }
  }

  private isFacebookCommentsPlaceholder(): boolean {
    const fbCommentsSpan = this.scrapingSupport.select(
      this.commentElement,
      "span",
      HTMLSpanElement,
      {
        predicate: (span) =>
          FB_COMMENTS_TEXT_REGEX.exec(span.innerText.trim()) !== null,
      },
    );
    return fbCommentsSpan !== undefined;
  }

  private scrapTextContent(commentCentralDiv: HTMLElement) {
    const commentContentDiv = this.scrapingSupport.selectOrThrow(
      commentCentralDiv,
      ":scope > div:nth-of-type(1) > div > div:nth-of-type(2)",
      HTMLElement,
      {
        parentElementDescriptor: "commentCentralDiv",
        selectedElementDescriptor: "commentContentDiv",
      },
    );
    const textContent = commentContentDiv.innerText.trim();
    return textContent;
  }

  private scrapPublishedAt(commentCentralDiv: HTMLElement) {
    const commentTimeElement = this.scrapingSupport.selectOrThrow(
      commentCentralDiv,
      ":scope time",
      HTMLTimeElement,
      {
        parentElementDescriptor: "commentCentralDiv",
        selectedElementDescriptor: "commentTimeElement",
      },
    );
    const publishedAt: PublicationDate = {
      type: "absolute",
      date: commentTimeElement.dateTime,
    };
    return publishedAt;
  }

  private scrapCommentHref(commentCentralDiv: HTMLElement): string {
    const commentAnchorElement = this.scrapingSupport.selectOrThrow(
      commentCentralDiv,
      ":scope a:has(time)",
      HTMLAnchorElement,
      {
        parentElementDescriptor: "commentCentralDiv",
        selectedElementDescriptor: "commentAnchorElement",
      },
    );
    return commentAnchorElement.href;
  }

  private scrapAuthor(commentCentralDiv: HTMLElement): Author {
    const accountAnchorElement = this.scrapingSupport.selectOrThrow(
      commentCentralDiv,
      ":scope a:nth-of-type(1)",
      HTMLAnchorElement,
    );
    return {
      name: accountAnchorElement.innerText.trim(),
      accountHref: accountAnchorElement.href,
    };
  }

  private scrapNbLikes(commentCentralDiv: HTMLElement): number {
    const likesButton = this.scrapingSupport.select(
      commentCentralDiv,
      ":scope [role='button']",
      HTMLDivElement,
      {
        predicate: (b) => LIKES_BUTTON_REGEX.test(b.innerText.trim()),
      },
    );
    if (!likesButton) {
      // Likes buttons is not present when there is no likes
      return 0;
    }
    const likesButtonInnerText = likesButton.innerText.trim();
    const regexMatchRes = LIKES_BUTTON_REGEX.exec(likesButtonInnerText);
    const nbLikesRaw = regexMatchRes?.groups?.nbLikes;
    if (!nbLikesRaw) {
      throw new Error(
        "Failed to parse Likes button innerText" + likesButtonInnerText,
      );
    }
    // Remove potential thousands separators
    const nbLikesStr = nbLikesRaw.replace(" ", "").replaceAll(",", "");
    return Number.parseInt(nbLikesStr);
  }
}
/**
 * Extract comment id from youtube link url.
 * Example for comment href /p/DYpO8J8tD_x/c/17965158078064905/ => commentId should be 17965158078064905
 * @param href
 */
export function extractCommentIdFromInstagramCommentHref(href: string): string {
  const parsed = URL.parse(href)!;
  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  return pathSegments[pathSegments.length - 1];
}

export type InstagramTextComment = {
  type: "text";
  data: Omit<CommentSnapshot, "replies">;
};

export type InstagramImageComment = {
  type: "image";
  data: Omit<
    CommentSnapshot,
    "replies" | "publishedAt" | "textContent" | "commentId"
  > & {
    imageSrc: string;
  };
};

export type FacebookCommentsPlaceholder = {
  type: "fb-comments";
  data: undefined;
};

/**
 * Comment Without replies
 */

export type InstagramComment =
  | InstagramTextComment
  | InstagramImageComment
  | FacebookCommentsPlaceholder;
