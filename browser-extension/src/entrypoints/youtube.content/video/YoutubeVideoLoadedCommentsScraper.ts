import type { Author } from "@/shared/model/Author";
import type { CommentSnapshot } from "@/shared/model/PostSnapshot";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { ElementScreenshotProvider } from "@/shared/screenshoting";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { parseCommentPublishedTime } from "./utils/parseCommentPublishedTime";
import { extractCommentIdFromCommentHref } from "./utils/extractCommentIdFromCommentHref";
import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import { encodePng } from "image-js";
import { parseIntegerSwallowingSeparators } from "./utils/parseIntegerSwallowingSeparators";

const logger = createLogger("yt-loaded-comments", scrapingLogger);

export class YoutubeVideoLoadedCommentsScraper {
  private readonly collectedPostIds = new Set<string>();
  constructor(
    private commentsContainer: HTMLElement,
    private scrapingSupport: ScrapingSupport,
    private screenshotProvider: ElementScreenshotProvider,
    private expectedCommentCount: number,
    private progressManager: ProgressManager,
  ) {}

  public async scrapLoadedCommentThreads(): Promise<CommentSnapshot[]> {
    logger.info("Capturing comment threads...");
    const threadContainers = this.scrapingSupport.selectAll(
      this.commentsContainer,
      "#contents > ytd-comment-thread-renderer",
      HTMLElement,
    );
    const comments = await this.scrapCommentThreads(threadContainers);
    return comments;
  }

  private async scrapCommentThreads(
    threadContainers: HTMLElement[],
  ): Promise<CommentSnapshot[]> {
    logger.info(`Found ${threadContainers.length} thread containers...`);

    const comments: CommentSnapshot[] = [];
    for (const threadContainer of threadContainers) {
      const thread = await this.scrapCommentThread(threadContainer);
      if (thread.scrapingStatus === "success") {
        comments.push(thread.comment);
      }
    }
    return comments;
  }

  private async scrapCommentThread(
    commentThreadContainer: HTMLElement,
  ): Promise<ScrapCommentThreadResult> {
    const commentContainer = this.scrapingSupport.selectOrThrow(
      commentThreadContainer,
      "#comment-container",
      HTMLElement,
    );

    // Comments in replies are sometime duplicated in other threads they don't belong to.
    // In that case they are not visible.
    // It occurs for instance in this video: https://www.youtube.com/watch?v=gluz-XXBvTk
    if (!this.scrapingSupport.isVisible(commentContainer)) {
      logger.warn("Ignoring invisible commentContainer");
      return {
        scrapingStatus: "failure",
        message: "The comment is not visible",
      };
    }

    const comment = await this.scrapCommentWithoutReplies(commentContainer);

    // Youtube sometimes has duplicate
    if (!comment.commentId) {
      throw new Error("Unexpected undefined commentId");
    }
    if (this.collectedPostIds.has(comment.commentId)) {
      logger.warn(
        "Ignoring duplicate comment from ",
        comment.author.name,
        " with id ",
        comment.commentId,
      );
      return {
        scrapingStatus: "failure",
        message: "Duplicate comment " + comment.commentId,
      };
    }
    this.collectedPostIds.add(comment.commentId);
    this.progressManager.setProgress(
      (100 * this.collectedPostIds.size) / this.expectedCommentCount,
    );

    const repliesContainer = this.scrapingSupport.select(
      commentThreadContainer,
      "#replies",
      HTMLElement,
    );

    if (repliesContainer) {
      comment.replies = await this.scrapCommentReplies(repliesContainer);
    }

    return {
      comment,
      scrapingStatus: "success",
    };
  }

  private async scrapCommentReplies(
    repliesContainer: HTMLElement,
  ): Promise<CommentSnapshot[]> {
    const expandedThreadsContainer = this.scrapingSupport.select(
      repliesContainer,
      "#expanded-threads",
      HTMLElement,
    );

    // Because of "fix Load replies is unstable",
    // it is possible that the replies have not been rendered yet
    if (!expandedThreadsContainer) {
      return [];
    }

    const repliesThreads = this.scrapingSupport.selectAll(
      expandedThreadsContainer,
      // To avoid capturing comment threads nested a level deeper, use an accurate selector.
      // If you figure out a better selector, feel free to improve this.
      ":scope > yt-sub-thread > .ytSubThreadSubThreadContent > ytd-comment-thread-renderer",
      HTMLElement,
    );

    return this.scrapCommentThreads(repliesThreads);
  }

  private async scrapCommentWithoutReplies(
    commentContainer: HTMLElement,
  ): Promise<CommentSnapshot> {
    const scrapDate = currentIsoDate();

    const author: Author = this.scrapCommentAuthor(commentContainer);
    const publishedTimeElement = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "#published-time-text",
      HTMLElement,
    );
    const publishedTimeText = publishedTimeElement.innerText;
    const publishedAt = parseCommentPublishedTime(publishedTimeText);
    logger.debug(`publishedAtInfo: ${JSON.stringify(publishedAt)}`);

    const commentHref = this.scrapingSupport.selectOrThrow(
      publishedTimeElement,
      "a",
      HTMLAnchorElement,
    ).href;
    const commentId = extractCommentIdFromCommentHref(commentHref);

    const commentTextHandle = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "#content-text",
      HTMLElement,
    );

    const nbLikes = this.scrapNbLikes(commentContainer);

    const commentText = this.scrapCommentText(commentTextHandle);

    const screenshot =
      await this.screenshotProvider.buildElementScreenshot(commentContainer);

    const screenshotData = uint8ArrayToBase64(encodePng(screenshot));

    return {
      id: crypto.randomUUID(),
      commentId,
      textContent: commentText,
      url: commentHref,
      author: author,
      publishedAt: publishedAt,
      scrapedAt: scrapDate,
      nbLikes: nbLikes,
      screenshotData,
      // replies are captured in other method
      replies: [],
    };
  }

  private scrapCommentAuthor(commentContainer: HTMLElement): Author {
    const authorTextHandle = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "a#author-text",
      HTMLAnchorElement,
    );
    const commentAuthor = authorTextHandle.innerText.trim();
    const commentAuthorHref = authorTextHandle?.href;

    const author: Author = {
      name: commentAuthor,
      accountHref: commentAuthorHref,
    };
    return author;
  }

  private scrapCommentText(commentTextHandle: HTMLElement): string {
    const iterator = document.createNodeIterator(commentTextHandle);
    const textElements: string[] = [];
    let node: Node | null;

    while ((node = iterator.nextNode())) {
      if (node instanceof Text && node.nodeValue) {
        textElements.push(node.nodeValue);
      } else if (node instanceof HTMLImageElement && node.alt) {
        textElements.push(node.alt);
      }
    }

    return textElements.join(" ").trim();
  }

  private scrapNbLikes(commentContainer: HTMLElement): number {
    const nbLikesStr = this.scrapingSupport
      .selectOrThrow(commentContainer, "#vote-count-middle", HTMLElement)
      .innerText.trim();
    if (nbLikesStr === "") {
      return 0;
    } else {
      return parseIntegerSwallowingSeparators(nbLikesStr);
    }
  }
}
type ScrapCommentThreadResult =
  | { scrapingStatus: "success"; comment: CommentSnapshot }
  | { scrapingStatus: "failure"; message: string };
