import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { InstagramComment } from "./InstagramLoadedCommentScraper";
import { InstagramLoadedCommentScraper } from "./InstagramLoadedCommentScraper";
import type { ElementScreenshotProvider } from "@/shared/screenshoting";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import type { Image } from "image-js";
import type { InstagramCommentThreadBatch } from "./InstagramCommentThreadBatch";

const logger = createLogger("ig-comment-threads", scrapingLogger);
/**
 * Scrape the loaded comments and replies in a batch.
 */
export class InstagramLoadedCommentThreadBatchScraper {
  constructor(
    private readonly scrapingSupport: ScrapingSupport,
    private readonly screenshotProvider: ElementScreenshotProvider,
  ) {}

  async scrapBatch(
    batch: InstagramCommentThreadBatch,
  ): Promise<InstagramCommentThread[]> {
    const commentThreadElements = batch.threadElements;
    logger.debug("Scraping ", commentThreadElements.length, " comment threads");
    // Screenshot capture yields to Instagram, which can add or replace replies.
    // Keep the same element selection for capture and scraping.
    const selectedThreads = commentThreadElements.map((threadElement) => ({
      commentElement: this.selectCommentElement(threadElement),
      replyElements: this.selectReplyElements(threadElement),
    }));
    const commentElements = selectedThreads.flatMap((thread) => [
      thread.commentElement,
      ...thread.replyElements,
    ]);
    const screenshots = await this.screenshotProvider.buildElementScreenshots(
      commentElements,
      new ProgressManager(() => undefined),
    );
    const screenshotsByElement = new Map(
      commentElements.map((element, index) => {
        const screenshot = screenshots[index];
        if (!screenshot) {
          throw new Error(
            `Missing Instagram comment screenshot at index ${index}.`,
          );
        }
        return [element, screenshot] as const;
      }),
    );
    const commentThreads = [];
    for (const thread of selectedThreads) {
      logger.debug(
        `Scraping comment threads  ${commentThreads.length + 1}/${commentThreadElements.length}`,
      );
      const commentThread = this.scrapCommentThread(
        thread.commentElement,
        thread.replyElements,
        screenshotsByElement,
      );
      commentThreads.push(commentThread);
    }

    return commentThreads;
  }

  private scrapCommentThread(
    commentDiv: HTMLElement,
    replyElements: HTMLElement[],
    screenshotsByElement: Map<HTMLElement, Image>,
  ): InstagramCommentThread {
    // Comment thread is composed of 1 or 2 divs:
    // * Comment Thread div
    // * Optionnal replies div
    const comment: InstagramComment = new InstagramLoadedCommentScraper(
      commentDiv,
      screenshotsByElement.get(commentDiv)!,
      this.scrapingSupport,
    ).scrapLoadedComment();

    const replies: InstagramComment[] = this.scrapCommentThreadReplies(
      replyElements,
      screenshotsByElement,
    );
    return {
      comment,
      replies,
    };
  }

  private scrapCommentThreadReplies(
    replyElements: HTMLElement[],
    screenshotsByElement: Map<HTMLElement, Image>,
  ): InstagramComment[] {
    const comments = [];
    for (const replyElement of replyElements) {
      const comment: InstagramComment = new InstagramLoadedCommentScraper(
        replyElement,
        screenshotsByElement.get(replyElement)!,
        this.scrapingSupport,
      ).scrapLoadedComment();
      comments.push(comment);
    }
    return comments;
  }

  private selectCommentElement(commentThreadElement: HTMLElement): HTMLElement {
    return this.scrapingSupport.selectOrThrow(
      commentThreadElement,
      ":scope > div:nth-of-type(1)",
      HTMLElement,
      {
        parentElementDescriptor: "commentThread",
        selectedElementDescriptor: "commentDiv",
      },
    );
  }

  private selectReplyElements(
    commentThreadElement: HTMLElement,
  ): HTMLElement[] {
    return this.scrapingSupport.selectAll(
      commentThreadElement,
      ":scope > div:nth-of-type(2) > ul > div",
      HTMLElement,
    );
  }
}

export type InstagramCommentThread = {
  comment: InstagramComment;
  // Instagram only has 2 levels
  replies: InstagramComment[];
};
