import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { InstagramComment } from "./InstagramLoadedCommentScraper";
import { InstagramLoadedCommentScraper } from "./InstagramLoadedCommentScraper";
import type { ElementScreenshotProvider } from "@/shared/screenshoting";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import { MASQUES_LES_COMMENTAIRES_BUTTON_REGEX } from "./instagramElementsTexts";
import type { Image } from "image-js";

const logger = createLogger("ig-comment-threads", scrapingLogger);
/**
 * Scrap comment threads. This assumes all comments as been loaded previously.
 */
export class InstagramLoadedCommentThreadsScraper {
  constructor(
    private commentsContainer: HTMLElement,
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private screenshotProvider: ElementScreenshotProvider,
  ) {}

  async scrapLoadedCommentThreads(): Promise<InstagramCommentThread[]> {
    const commentThreadElements = this.scrapingSupport.selectAll(
      this.commentsContainer,
      ":scope > div",
      HTMLElement,
      {
        predicate: (e) =>
          !MASQUES_LES_COMMENTAIRES_BUTTON_REGEX.test(e.innerText.trim()),
      },
    );

    return await this.scrapCommentThreadElements(commentThreadElements);
  }

  private async scrapCommentThreadElements(
    commentThreadElements: HTMLElement[],
  ): Promise<InstagramCommentThread[]> {
    logger.debug("Scraping ", commentThreadElements.length, " comment threads");
    const commentElements = commentThreadElements.flatMap((threadElement) => [
      this.selectCommentElement(threadElement),
      ...this.selectReplyElements(threadElement),
    ]);
    const screenshotProgressMgr = this.progressManager.subTaskProgressManager({
      from: 0,
      to: 90,
    });
    const scrapCommentsProgressMgr =
      this.progressManager.subTaskProgressManager({
        from: 90,
        to: 100,
      });
    const screenshots = await this.screenshotProvider.buildElementScreenshots(
      commentElements,
      screenshotProgressMgr,
    );
    const screenshotsByElement = new Map(
      commentElements.map(
        (element, index) => [element, screenshots[index]!] as const,
      ),
    );
    const commentThreads = [];
    for (const commentThreadEl of commentThreadElements) {
      logger.debug(
        `Scraping comment threads  ${commentThreads.length + 1}/${commentThreadElements.length}`,
      );
      const commentThread = this.scrapCommentThread(
        commentThreadEl,
        screenshotsByElement,
      );
      commentThreads.push(commentThread);
      scrapCommentsProgressMgr.setProgress(
        (commentThreads.length / commentThreadElements.length) * 100,
      );
    }

    return commentThreads;
  }

  private scrapCommentThread(
    commentThreadElement: HTMLElement,
    screenshotsByElement: Map<HTMLElement, Image>,
  ): InstagramCommentThread {
    // Comment thread is composed of 1 or 2 divs:
    // * Comment Thread div
    // * Optionnal replies div
    const commentDiv = this.selectCommentElement(commentThreadElement);
    const comment: InstagramComment = new InstagramLoadedCommentScraper(
      commentDiv,
      screenshotsByElement.get(commentDiv)!,
      this.scrapingSupport,
    ).scrapLoadedComment();

    const replyThreadElements = this.selectReplyElements(commentThreadElement);

    const replies: InstagramComment[] = this.scrapCommentThreadReplies(
      replyThreadElements,
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
  // INstagram only has 2 levels
  replies: InstagramComment[];
};
