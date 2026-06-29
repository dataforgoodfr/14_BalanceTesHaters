import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { VIEW_REPLIES_BUTTON_TEXT_REGEX } from "./tiktokElementsTexts";

const logger = createLogger("[CS - TiktokCommentsLoader]");

export class TiktokCommentsLoader {
  constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private commentsContainer: HTMLElement,
  ) {}

  public async loadCommentsAndReplies() {
    await this.loadAllTopLevelComments();
    await this.loadAllReplies();
  }

  private async loadAllTopLevelComments() {
    logger.debug("Loading top level comments - Perform Infinite Loading");
    await this.performCommentsInfiniteLoading();
  }

  private async loadAllReplies() {
    let viewRepliesButtons = this.selectViewRepliesButtons();

    while (viewRepliesButtons.length !== 0) {
      logger.debug(
        `Found ${viewRepliesButtons.length} view replies buttons - clicking them`,
      );
      for (const b of viewRepliesButtons) {
        await this.scrapingSupport.click(b);
      }
      await this.scrapingSupport.sleep(500);
      viewRepliesButtons = this.selectViewRepliesButtons();
    }

    logger.debug("No more view replies buttons found.");
  }

  private selectViewRepliesButtons(): HTMLElement[] {
    return this.scrapingSupport.selectAll(
      this.commentsContainer,
      "[role='button']",
      HTMLElement,
      {
        predicate: (b) => VIEW_REPLIES_BUTTON_TEXT_REGEX.test(b.innerText),
      },
    );
  }

  private async performCommentsInfiniteLoading() {
    const container = this.commentsContainer;
    let previousCommentCount = 0;

    for (let i = 0; i < 200; i++) {
      container.scrollTo({ top: container.scrollHeight });
      await this.scrapingSupport.resumeHostPage();
      await this.scrapingSupport.sleep(800);

      const currentCommentCount = this.scrapingSupport.selectAll(
        container,
        ":scope > div",
        HTMLElement,
      ).length;

      this.updateLoadingProgress(currentCommentCount);

      if (currentCommentCount === previousCommentCount) {
        logger.debug("No new comments loaded, assuming end of comments");
        break;
      }
      previousCommentCount = currentCommentCount;
    }
  }

  private updateLoadingProgress(loadedCount: number) {
    this.progressManager.setProgress(Math.min(loadedCount / 2, 50));
  }
}
