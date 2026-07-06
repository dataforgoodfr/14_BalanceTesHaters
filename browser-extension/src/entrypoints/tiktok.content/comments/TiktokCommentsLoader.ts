import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { VIEW_REPLIES_BUTTON_INNER_TEXT_REGEX } from "../tiktokElementsTexts";
import { hasClassNameWithSuffix } from "../dom/hasClassNameWithSuffix";

const logger = createLogger("[CS - TiktokCommentsLoader]");

export class TiktokCommentsLoader {
  constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private commentsScrollableContainer: HTMLElement,
    private expectedCommentCount: number,
  ) {}

  public async loadCommentsAndReplies() {
    logger.debug(
      "Loading comments and replies - Expecting a total of " +
        this.expectedCommentCount +
        " comments",
    );

    await this.loadAllTopLevelComments();
    await this.loadAllReplies();
  }

  private async loadAllTopLevelComments() {
    logger.debug("Loading top level comments - Perform Infinite Loading");
    const scrollableContainer = this.commentsScrollableContainer;
    let previousScrollHeight = 0;
    let lastScrollHeightChange = Date.now();
    // Consider done loading if no height change after 5s
    const CONSIDER_DONE_AFTER_STABLE_HEIGHT_DELAY = 5000;
    while (true) {
      this.updateLoadingProgress();
      const currentScrollHeight = scrollableContainer.scrollHeight;
      scrollableContainer.scrollTo({ top: scrollableContainer.scrollHeight });

      if (currentScrollHeight > previousScrollHeight) {
        logger.debug(
          "Scroll height changed. ScrollTo:" + scrollableContainer.scrollHeight,
        );
        previousScrollHeight = currentScrollHeight;
        lastScrollHeightChange = Date.now();
      } else if (
        Date.now() >
        lastScrollHeightChange + CONSIDER_DONE_AFTER_STABLE_HEIGHT_DELAY
      ) {
        logger.debug("Done infinite loading done.");
        break;
      }
      await this.scrapingSupport.sleep(500);
    }
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
      this.updateLoadingProgress();
      viewRepliesButtons = this.selectViewRepliesButtons();
    }

    logger.debug("No more view replies buttons found.");
  }

  private selectViewRepliesButtons(): HTMLElement[] {
    return this.scrapingSupport.selectAll(
      this.commentsScrollableContainer,
      "button,span",
      HTMLElement,
      {
        predicate: (b) =>
          VIEW_REPLIES_BUTTON_INNER_TEXT_REGEX.test(b.innerText),
      },
    );
  }

  private updateLoadingProgress() {
    const loadedCount = this.scrapingSupport.selectAll(
      this.commentsScrollableContainer,
      ":scope > div",
      HTMLElement,
      {
        predicate: (e) => hasClassNameWithSuffix(e, "DivCommentItemWrapper"),
      },
    ).length;
    this.progressManager.setProgress(
      (loadedCount / this.expectedCommentCount) * 100,
    );
  }
}
