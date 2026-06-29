import { CommentSnapshot, PostSnapshot } from "@/shared/model/PostSnapshot";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { TiktokCommentsLoader } from "./TiktokCommentsLoader";
import { TiktokLoadedCommentScraper } from "./TiktokLoadedCommentScraper";
import { createScreenshotProviderForScrollableDescendants } from "@/shared/screenshoting";
import { ElementScreenshotProvider } from "@/shared/screenshoting/provider/ElementScreenshotProvider";
import {
  INVALID_TT_VIDEOURL,
  parseTiktokVideoUrl,
} from "./parseTiktokVideoUrl";

const logger = createLogger("[CS - TiktokPostScraper]");

export class TiktokPostScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
  ) {}

  async scrapPost(): Promise<PostSnapshot> {
    logger.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const result = parseTiktokVideoUrl(url);
    if (result === INVALID_TT_VIDEOURL) {
      throw new Error(INVALID_TT_VIDEOURL);
    }
    const scrapedAt = currentIsoDate();
    const id = crypto.randomUUID();
    const postId = result.postId;

    const coverImageUrl = this.extractCoverImageUrl();
    const { author, textContent, publishedAt } = this.extractPostInfo();

    logger.debug("Post info extracted:", {
      coverImageUrl,
      author,
      textContent,
      publishedAt,
    });

    const commentsContainer = await this.findCommentsContainer();

    await new TiktokCommentsLoader(
      this.scrapingSupport,
      this.progressManager.subTaskProgressManager({ from: 0, to: 50 }),
      commentsContainer,
    ).loadCommentsAndReplies();

    const screenshotProvider: ElementScreenshotProvider =
      await createScreenshotProviderForScrollableDescendants(
        commentsContainer,
        this.scrapingSupport,
        this.progressManager.subTaskProgressManager({ from: 50, to: 90 }),
      );

    const comments = await this.scrapAllComments(
      commentsContainer,
      screenshotProvider,
    );

    return {
      id,
      socialNetwork: SocialNetwork.TikTok,
      postId,
      author,
      publishedAt,
      textContent,
      scrapedAt,
      url,
      coverImageUrl,
      comments,
    };
  }

  private extractCoverImageUrl(): string | undefined {
    const ogImage = this.scrapingSupport.select(
      document,
      "meta[property='og:image']",
      HTMLMetaElement,
    );
    return ogImage?.content ?? undefined;
  }

  private extractPostInfo(): {
    author: { name: string; accountHref: string };
    textContent: string | undefined;
    publishedAt: { type: "absolute"; date: string };
  } {
    const author = this.scrapAuthor();
    const textContent = this.scrapDescription();
    const publishedAt = this.scrapPublishedAt();

    return { author, textContent, publishedAt };
  }

  private scrapAuthor(): { name: string; accountHref: string } {
    const authorLink = this.scrapingSupport.select(
      document,
      "a[href*='/@']",
      HTMLAnchorElement,
    );
    const accountHref =
      authorLink?.href ??
      `https://www.tiktok.com${document.URL.split("video")[0]}`;
    const name =
      authorLink?.innerText.trim() ??
      accountHref.split("/").filter(Boolean).pop() ??
      "unknown";
    return { name, accountHref };
  }

  private scrapDescription(): string | undefined {
    const ogDescription = this.scrapingSupport.select(
      document,
      "meta[property='og:description']",
      HTMLMetaElement,
    );
    return ogDescription?.content ?? undefined;
  }

  private scrapPublishedAt(): { type: "absolute"; date: string } {
    const dateMeta = this.scrapingSupport.select(
      document,
      "meta[property='article:published_time']",
      HTMLMetaElement,
    );
    if (dateMeta?.content) {
      return { type: "absolute", date: dateMeta.content };
    }
    return { type: "absolute", date: currentIsoDate() };
  }

  private async findCommentsContainer(): Promise<HTMLElement> {
    const commentSection = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "[class*='DivCommentContainer']",
      HTMLElement,
      { timeout: 10000 },
    );
    return commentSection;
  }

  private async scrapAllComments(
    container: HTMLElement,
    screenshotProvider: ElementScreenshotProvider,
  ): Promise<CommentSnapshot[]> {
    const commentElements = this.scrapingSupport.selectAll(
      container,
      ":scope > div",
      HTMLElement,
    );

    logger.debug(`Scraping ${commentElements.length} comments`);

    const comments: CommentSnapshot[] = [];
    for (let i = 0; i < commentElements.length; i++) {
      logger.debug(`Scraping comment ${i + 1}/${commentElements.length}`);
      const comment = await new TiktokLoadedCommentScraper(
        commentElements[i],
        screenshotProvider,
        this.scrapingSupport,
      ).scrapLoadedComment();
      if (comment.type === "text") {
        comments.push({ ...comment.data, replies: [] });
      }
      this.progressManager.setProgress(
        ((i + 1) / commentElements.length) * 100,
      );
    }

    return comments;
  }
}
