import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import { InstagramCommentThreadBatch } from "./InstagramCommentThreadBatch";
import {
  MASQUES_LES_COMMENTAIRES_BUTTON_REGEX,
  SHOW_HIDDEN_COMMENTS_REGEX,
} from "./instagramElementsTexts";

const logger = createLogger("ig-batch-loader", scrapingLogger);

export class InstagramCommentThreadBatchLoader {
  private readonly identifiedThreadElements = new Set<HTMLElement>();
  private hiddenCommentsRequested = false;

  constructor(
    private readonly scrapingSupport: ScrapingSupport,
    private readonly scrollableContainer: HTMLElement,
    private readonly commentsContainer: HTMLElement,
    private readonly batchSize = 50,
  ) {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error("Instagram batch size must be a positive integer.");
    }
  }

  async loadAndIdentifyNextBatch(): Promise<InstagramCommentThreadBatch> {
    let moreToLoad = true;
    while (
      this.findUnidentifiedThreads().length < this.batchSize &&
      moreToLoad
    ) {
      const moreLoaded = await this.loadMoreThreads();
      moreToLoad = moreLoaded;
    }

    const unidentifiedThreads = this.findUnidentifiedThreads();
    if (unidentifiedThreads.length === 0) {
      logger.debug(`No more commen threads: Returning empty batch.`);
      return new InstagramCommentThreadBatch([]);
    }

    const batchElements = unidentifiedThreads.slice(0, this.batchSize);
    for (const threadElement of batchElements) {
      this.identifiedThreadElements.add(threadElement);
    }
    logger.debug(
      `Returning Comment Thread Batch of ${batchElements.length} threads (of ${unidentifiedThreads.length} loaded unprocessed threads)`,
    );
    return new InstagramCommentThreadBatch(batchElements);
  }

  private findUnidentifiedThreads(): HTMLElement[] {
    return this.findAllThreads().filter(
      (element) => !this.identifiedThreadElements.has(element),
    );
  }

  private findAllThreads(): HTMLElement[] {
    return this.scrapingSupport.selectAll(
      this.commentsContainer,
      ":scope > div",
      HTMLElement,
      {
        predicate: (element) =>
          !element.matches("[aria-hidden='true']") &&
          !element.matches("[role='progressbar']") &&
          !element.querySelector(":scope [role='progressbar']") &&
          !SHOW_HIDDEN_COMMENTS_REGEX.test(element.innerText.trim()) &&
          !MASQUES_LES_COMMENTAIRES_BUTTON_REGEX.test(element.innerText.trim()),
      },
    );
  }

  private async loadMoreThreads(): Promise<boolean> {
    const previousThreads = new Set(this.findAllThreads());
    const spinner = this.selectSpinner();
    if (spinner) {
      logger.debug("Loading the next page of comments");
      this.scrollableContainer.scrollTo({
        top: this.scrollableContainer.scrollHeight,
      });
      if (await this.waitForNewThread(previousThreads)) return true;
    }

    if (!this.hiddenCommentsRequested) {
      const hiddenCommentsButton = await this.waitForHiddenCommentsButton();
      if (hiddenCommentsButton) {
        this.hiddenCommentsRequested = true;
        logger.debug("Loading hidden comments");
        await this.scrapingSupport.click(hiddenCommentsButton);
        return this.waitForNewThread(previousThreads);
      }
    }

    return false;
  }

  private async waitForNewThread(
    previousThreads: Set<HTMLElement>,
  ): Promise<boolean> {
    const timeout = 10_000;
    const startedAt = Date.now();
    let loadingStoppedAt: number | undefined;
    while (Date.now() - startedAt < timeout) {
      await this.scrapingSupport.resumeHostPage();
      if (
        this.findAllThreads().some((thread) => !previousThreads.has(thread))
      ) {
        return true;
      }
      if (this.selectSpinner()) {
        loadingStoppedAt = undefined;
      } else {
        loadingStoppedAt ??= Date.now();
        if (Date.now() - loadingStoppedAt >= 1_000) return false;
      }
      await this.scrapingSupport.sleep(200);
    }
    throw new Error(
      `Timed out waiting for Instagram comment threads after ${timeout}ms.`,
    );
  }

  private selectSpinner(): HTMLElement | undefined {
    return this.scrapingSupport.select(
      this.commentsContainer,
      ":scope [role='progressbar']",
      HTMLElement,
    );
  }

  private async waitForHiddenCommentsButton(): Promise<
    HTMLElement | undefined
  > {
    const result = await this.scrapingSupport.waitForSelector(
      this.commentsContainer,
      "[role='button']",
      HTMLElement,
      {
        // Instagram can render this control shortly after continuation ends.
        timeout: 2_000,
        predicate: (button) =>
          SHOW_HIDDEN_COMMENTS_REGEX.test(button.innerText.trim()),
      },
    );
    return result.status === "success" ? result.element : undefined;
  }
}
