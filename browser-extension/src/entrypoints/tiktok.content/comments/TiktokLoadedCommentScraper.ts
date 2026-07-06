import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { Author } from "@/shared/model/Author";
import { ElementScreenshotProvider } from "@/shared/screenshoting/provider/ElementScreenshotProvider";
import { imageToPngBase64 } from "@/shared/screenshoting/";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";
import { tiktokAccountHref } from "../url/tiktokAccountHref";
import { hasClassNameWithSuffix } from "../dom/hasClassNameWithSuffix";

export class TiktokLoadedCommentScraper {
  constructor(
    private readonly commentElement: HTMLElement,
    private readonly screenshotProvider: ElementScreenshotProvider,
    private readonly scrapingSupport: ScrapingSupport,
  ) {}

  async scrapLoadedComment(): Promise<CommentWithoutReplies> {
    const id = crypto.randomUUID();
    const scrapedAt = currentIsoDate();
    const screenshotImage =
      await this.screenshotProvider.buildElementScreenshot(this.commentElement);
    const screenshotData = imageToPngBase64(screenshotImage);

    const author = this.scrapAuthor();
    const nbLikes = this.scrapNbLikes();
    const textContent = this.scrapTextContent();

    // TODO fix published at
    const publishedAt = this.scrapPublishedAt();
    // TODO comment id and comment href are missing in tiktok!!
    const commentId = "TODO" + id;

    return {
      id,
      scrapedAt,
      commentId,
      nbLikes,
      author,
      textContent,
      publishedAt,
      screenshotData,
    };
  }

  private scrapTextContent(): string {
    const contentWrapper = this.scrapingSupport.selectOrThrow(
      this.commentElement,
      "div",
      HTMLDivElement,
      {
        predicate: (s) => hasClassNameWithSuffix(s, "DivCommentContentWrapper"),
      },
    );
    const text = this.scrapingSupport.selectOrThrow(
      contentWrapper,
      ":scope > span",
      HTMLSpanElement,
    ).innerText;
    return text.trim();
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

  private scrapAuthor(): Author {
    const authorLink = this.scrapingSupport.selectOrThrow(
      this.commentElement,
      "a[href^='/@']",
      HTMLAnchorElement,
    );

    const accountId = authorLink.href.substring(authorLink.href.indexOf("@"));
    return {
      name: accountId,
      accountHref: tiktokAccountHref(accountId),
    };
  }

  private scrapNbLikes(): number {
    const likeButton = this.scrapingSupport.selectOrThrow(
      this.commentElement,
      "div[role='button']",
      HTMLElement,
      {
        predicate: (b) =>
          ariaLabel(b) !== undefined &&
          LIKES_COUNT_REGEX_ARIA_LABEL.test(ariaLabel(b)!),
      },
    );
    const match = ariaLabel(likeButton)?.match(LIKES_COUNT_REGEX_ARIA_LABEL);
    if (!match) {
      throw new Error("Failed to extract likes");
    }

    const raw = match[1].replace(/\./g, "").replace(",", ".");
    return Number.parseInt(raw);
  }
}

const LIKES_COUNT_REGEX_ARIA_LABEL =
  /Laisser un j'aime sur la vidéo\s+(?<nbLikes>[\d\s,.]+)\s+j'aime/;

export type CommentWithoutReplies = Omit<CommentSnapshot, "replies">;
/** in happy-dom element.ariaLabel is undefined even if aria-label is defined!! so this is needed for unit tests to work */
function ariaLabel(element: HTMLElement): string | null {
  return element.ariaLabel || element.getAttribute("aria-label");
}
