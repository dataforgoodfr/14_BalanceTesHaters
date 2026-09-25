import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import type { YoutubeVideoCommentThreadRoot } from "./YoutubeVideoCommentThreadBatch";
import { ytBaseLogger } from "../../ytBaseLogger";

const logger = createLogger("thread-content-loader", ytBaseLogger);

export class YoutubeVideoCommentThreadContentLoader {
  constructor(private readonly scrapingSupport: ScrapingSupport) {}

  async loadThreadContent(
    threadRoot: YoutubeVideoCommentThreadRoot,
  ): Promise<void> {
    logger.debug(`Loading comment thread ${threadRoot.commentId}`);
    await this.loadAllReplies(threadRoot.element);
    await this.expandLongComments(threadRoot.element);
  }

  private async loadAllReplies(threadRoot: HTMLElement): Promise<void> {
    const initialReplyButtons = this.visibleElements(
      threadRoot,
      "#replies #more-replies button" +
        "," +
        "#replies #more-replies-sub-thread button",
    );
    await this.expandReplies(initialReplyButtons, threadRoot);

    const clickedMoreRepliesButtons = new Set<HTMLElement>();
    for (;;) {
      await this.scrapingSupport.resumeHostPage();
      const selectedButtons = this.visibleElements(
        threadRoot,
        'button[aria-label="Afficher plus de réponses"],' +
          'button[aria-label="Show more replies"]',
      );
      const alreadyClickedButtons = selectedButtons.filter((button) =>
        clickedMoreRepliesButtons.has(button),
      );
      if (alreadyClickedButtons.length > 0) {
        logger.warn(
          `Ignoring ${alreadyClickedButtons.length} reply buttons that remained visible after being clicked`,
          alreadyClickedButtons,
        );
      }

      const buttonsToClick = selectedButtons.filter(
        (button) => !clickedMoreRepliesButtons.has(button),
      );
      if (buttonsToClick.length === 0) return;

      await this.expandReplies(buttonsToClick, threadRoot);
      for (const button of buttonsToClick) {
        clickedMoreRepliesButtons.add(button);
      }
    }
  }

  private async expandReplies(
    buttons: HTMLElement[],
    threadRoot: HTMLElement,
  ): Promise<void> {
    if (buttons.length === 0) return;
    logger.debug(`Expanding ${buttons.length} reply buttons`);
    for (const button of buttons) {
      button.scrollIntoView();
      button.click();
    }
    await this.waitForRepliesToLoad(threadRoot);
  }

  private async expandLongComments(threadRoot: HTMLElement): Promise<void> {
    const readMoreButtons = this.visibleElements(threadRoot, "#more");
    logger.debug(`Expanding ${readMoreButtons.length} long comments`);
    for (const button of readMoreButtons) {
      button.scrollIntoView();
      button.click();
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private async waitForRepliesToLoad(threadRoot: HTMLElement): Promise<void> {
    await this.scrapingSupport.sleep(300);

    const timeoutPerElement = 5000;
    const startedAt = Date.now();
    const listGhostSections = () =>
      this.visibleElements(threadRoot, "#ghost-comment-section");
    const initialCount = listGhostSections().length;
    let timeoutAt = Date.now() + initialCount * timeoutPerElement;

    for (;;) {
      const remainingGhostSections = listGhostSections();
      if (remainingGhostSections.length === 0) return;
      logger.debug(
        `${remainingGhostSections.length}/${initialCount} reply placeholders remain after ${Date.now() - startedAt}ms`,
      );
      if (Date.now() > timeoutAt) {
        logger.warn(
          `Reply loading timed out after ${Date.now() - startedAt}ms with ${remainingGhostSections.length} placeholders remaining`,
        );
        return;
      }

      timeoutAt = Math.min(
        timeoutAt,
        Date.now() + remainingGhostSections.length * timeoutPerElement,
      );
      for (const element of remainingGhostSections) {
        element.scrollIntoView();
        await this.scrapingSupport.resumeHostPage();
      }
      await this.scrapingSupport.sleep(500);
    }
  }

  private visibleElements(parent: ParentNode, selector: string): HTMLElement[] {
    return this.scrapingSupport
      .selectAll(parent, selector, HTMLElement)
      .filter((element) => this.scrapingSupport.isVisible(element));
  }
}
