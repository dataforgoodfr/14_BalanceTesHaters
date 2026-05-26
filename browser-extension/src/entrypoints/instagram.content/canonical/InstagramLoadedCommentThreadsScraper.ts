import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  InstagramComment,
  InstagramLoadedCommentScraper,
} from "./InstagramLoadedCommentScraper";
import { ElementScreenshotProvider } from "./screenshoting/ElementScreenshotProvider";
import { createLogger } from "@/shared/utils/createLogger";
import { MASQUES_LES_COMMENTAIRES_BUTTON_REGEX } from "./instagramElementsTexts";

const logger = createLogger("[CS - InstagramLoadedCommentThreadsScraper]");
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
    const commentThreads = [];
    for (const commentThreadEl of commentThreadElements) {
      logger.debug(
        `Scraping comment threads  ${commentThreads.length + 1}/${commentThreadElements.length}`,
      );
      const commentThread = await this.scrapCommentThread(commentThreadEl);
      commentThreads.push(commentThread);
      this.progressManager.setProgress(
        (commentThreads.length / commentThreadElements.length) * 100,
      );
    }

    return commentThreads;
  }

  private async scrapCommentThread(
    commentThreadElement: HTMLElement,
  ): Promise<InstagramCommentThread> {
    // Comment thread is composed of 1 or 2 divs:
    // * Comment Thread div
    // * Optionnal replies div
    const commentDiv = this.scrapingSupport.selectOrThrow(
      commentThreadElement,
      ":scope > div:nth-of-type(1)",
      HTMLElement,
    );
    const comment: InstagramComment = await new InstagramLoadedCommentScraper(
      commentDiv,
      this.screenshotProvider,
      this.scrapingSupport,
    ).scrapLoadedComment();

    const replyThreadElements = this.scrapingSupport.selectAll(
      commentThreadElement,
      ":scope > div:nth-of-type(2) > ul > div",
      HTMLElement,
    );

    const replies: InstagramComment[] =
      await this.scrapCommentThreadReplies(replyThreadElements);
    return {
      comment,
      replies,
    };
  }

  private async scrapCommentThreadReplies(
    replyElements: HTMLElement[],
  ): Promise<InstagramComment[]> {
    const comments = [];
    for (const replyElement of replyElements) {
      const comment: InstagramComment = await new InstagramLoadedCommentScraper(
        replyElement,
        this.screenshotProvider,
        this.scrapingSupport,
      ).scrapLoadedComment();
      comments.push(comment);
    }
    return comments;
  }
}

export type InstagramCommentThread = {
  comment: InstagramComment;
  // INstagram only has 2 levels
  replies: InstagramComment[];
};
