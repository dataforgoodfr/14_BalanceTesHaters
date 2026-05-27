import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import {
  REPLY_BUTTON_REGEX as REPLY_BUTTON_REGEX,
  SHOW_HIDDEN_COMMENTS_REGEX,
  VIEW_REPLIES_BUTTON_TEXT_REGEX,
} from "./instagramElementsTexts";

const logger = createLogger("[CS - InstagramCommentsLoader]");

export class InstagramCommentsLoader {
  constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private expectedCommentsCount: number,
    private scrollableContainer: HTMLElement,
    private commentsContainer: HTMLElement,
  ) {}

  public async loadCommentsAndReplies() {
    await this.loadAllTopLevelComments();
    await this.loadAllReplies();
  }

  private async loadAllTopLevelComments() {
    logger.debug("Loading top level comments - Perform Infinite Loading");
    await this.performCommentsInfiniteLoading();

    this.commentsContainer.scrollIntoView({ block: "end" });
    await this.scrapingSupport.resumeHostPage();

    logger.debug(`Looking for "View hidden comments" button...`);
    const hiddenCommentsSelectResult =
      await this.scrapingSupport.waitForSelector(
        this.commentsContainer,
        "[role='button']",
        HTMLElement,
        {
          timeout: 2000,
          predicate: (b) => SHOW_HIDDEN_COMMENTS_REGEX.test(b.innerText.trim()),
        },
      );
    if (hiddenCommentsSelectResult.status === "failure") {
      logger.debug(`No "View hidden comments" button found`);
      return;
    }

    logger.debug(`Found a button - Clicking it`);
    await this.scrapingSupport.click(hiddenCommentsSelectResult.element);
    this.commentsContainer.scrollIntoView({ block: "end" });
  }

  private async loadAllReplies() {
    let viewRepliesButtons = this.selectViewRepliesButtons();

    while (viewRepliesButtons.length != 0) {
      logger.debug(
        `Found ${viewRepliesButtons.length} view replies buttons - clicking them`,
      );
      for (const b of viewRepliesButtons) {
        // Expand replies
        await this.scrapingSupport.click(b);
        this.updateCommentLoadingProgress();
      }
      await this.scrapingSupport.sleep(500);
      viewRepliesButtons = this.selectViewRepliesButtons();
    }
    this.updateCommentLoadingProgress();

    logger.debug(`No more view replies buttons found.`);
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
    let spinner = this.selectSpinner();
    while (spinner) {
      this.scrollableContainer.scrollTo({
        top: this.scrollableContainer.scrollHeight,
      });
      await this.scrapingSupport.resumeHostPage();
      this.updateCommentLoadingProgress();

      // Wait a bit to let page load stuff
      await this.scrapingSupport.sleep(500);
      spinner = this.selectSpinner();
    }
  }

  private selectSpinner(): HTMLElement | undefined {
    return this.scrapingSupport.select(
      this.commentsContainer,
      ":scope [role=progressbar]",
      HTMLElement,
    );
  }

  private updateCommentLoadingProgress() {
    // Identify loaded comments count by the number of Reply buttons
    const loadedCommentsCount = this.scrapingSupport.selectAll(
      this.commentsContainer,
      "[role='button']",
      HTMLElement,
      {
        predicate: (b) => REPLY_BUTTON_REGEX.test(b.innerText.trim()),
      },
    ).length;

    if (this.expectedCommentsCount !== 0) {
      const commentsLoadingProgress =
        (100 * loadedCommentsCount) / this.expectedCommentsCount;
      this.progressManager.setProgress(commentsLoadingProgress);
    }
  }
}
