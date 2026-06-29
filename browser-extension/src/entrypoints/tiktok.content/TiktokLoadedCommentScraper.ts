import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { Author } from "@/shared/model/Author";
import { ElementScreenshotProvider } from "@/shared/screenshoting/provider/ElementScreenshotProvider";
import { imageToPngBase64 } from "@/shared/screenshoting/";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";
import { LIKES_COUNT_REGEX } from "./tiktokElementsTexts";

export class TiktokLoadedCommentScraper {
  constructor(
    private readonly commentElement: HTMLElement,
    private readonly screenshotProvider: ElementScreenshotProvider,
    private readonly scrapingSupport: ScrapingSupport,
  ) {}

  async scrapLoadedComment(): Promise<TiktokComment> {
    const id = crypto.randomUUID();
    const scrapedAt = currentIsoDate();
    const screenshotImage =
      await this.screenshotProvider.buildElementScreenshot(this.commentElement);
    const screenshotData = imageToPngBase64(screenshotImage);

    const commentHref = this.scrapCommentHref();
    const commentId = extractCommentIdFromTiktokCommentHref(commentHref);

    const author = this.scrapAuthor();
    const nbLikes = this.scrapNbLikes();
    const publishedAt = this.scrapPublishedAt();
    const textContent = this.scrapTextContent();

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

  private scrapTextContent(): string {
    const textSpan = this.scrapingSupport.select(
      this.commentElement,
      "span",
      HTMLSpanElement,
      {
        predicate: (s) =>
          s.innerText.trim().length > 0 && !s.querySelector("a"),
      },
    );
    return textSpan?.innerText.trim() ?? "";
  }

  private scrapPublishedAt(): PublicationDate {
    const timeElement = this.scrapingSupport.select(
      this.commentElement,
      "span",
      HTMLSpanElement,
      {
        predicate: (s) => /\d+[smhdw]/.test(s.innerText.trim()),
      },
    );
    const dateText = timeElement?.innerText.trim() ?? "";
    return {
      type: "relative",
      dateText,
      resolvedDateRange: {
        start: "2000-01-01T00:00:00.000Z",
        end: "2000-01-01T00:00:00.000Z",
      },
    };
  }

  private scrapCommentHref(): string {
    const commentLink = this.scrapingSupport.select(
      this.commentElement,
      "a[href*='/comment/']",
      HTMLAnchorElement,
    );
    return (
      commentLink?.href ?? `https://www.tiktok.com${document.URL.split("?")[0]}`
    );
  }

  private scrapAuthor(): Author {
    const authorLink = this.scrapingSupport.select(
      this.commentElement,
      "a[href*='/@']",
      HTMLAnchorElement,
    );
    return {
      name: authorLink?.innerText.trim() ?? "unknown",
      accountHref: authorLink?.href ?? "https://www.tiktok.com",
    };
  }

  private scrapNbLikes(): number {
    const likeButton = this.scrapingSupport.select(
      this.commentElement,
      "[role='button']",
      HTMLElement,
      {
        predicate: (b) => LIKES_COUNT_REGEX.test(b.innerText.trim()),
      },
    );
    if (!likeButton) return 0;
    const match = LIKES_COUNT_REGEX.exec(likeButton.innerText.trim());
    if (!match?.groups?.nbLikes) return 0;
    const raw = match.groups.nbLikes.replace(/\./g, "").replace(",", ".");
    return Number.parseInt(raw) || 0;
  }
}

function extractCommentIdFromTiktokCommentHref(href: string): string {
  const parsed = URL.parse(href);
  if (!parsed) return href;
  return parsed.searchParams.get("comment_id") ?? parsed.href;
}

export type TiktokComment = {
  type: "text";
  data: Omit<CommentSnapshot, "replies">;
};
