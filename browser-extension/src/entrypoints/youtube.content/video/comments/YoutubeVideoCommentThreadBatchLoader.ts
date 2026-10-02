import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import {
  YoutubeVideoCommentThreadBatch,
  type YoutubeVideoCommentThreadRoot,
} from "./YoutubeVideoCommentThreadBatch";
import { extractCommentIdFromCommentHref } from "./utils/extractCommentIdFromCommentHref";
import { ytBaseLogger } from "../../ytBaseLogger";

const logger = createLogger("batch-loader", ytBaseLogger);
const BATCH_SIZE = 50;

export class YoutubeVideoCommentThreadBatchLoader {
  private readonly batchIdentifiedCommentIds = new Set<string>();

  constructor(
    private readonly commentsContainer: HTMLElement,
    private readonly scrapingSupport: ScrapingSupport,
  ) {}

  async loadAndIdentifyNextBatch(): Promise<
    YoutubeVideoCommentThreadBatch | undefined
  > {
    let unidentifiedLoadedThreads: YoutubeVideoCommentThreadRoot[] =
      this.buildBatchUnidentifiedLoadedThreadRoots();
    let moreToLoad: boolean = true;
    while (unidentifiedLoadedThreads.length < BATCH_SIZE && moreToLoad) {
      logger.debug(
        `Not enough unidentifiedLoadedThreads: loading next continuation page...`,
      );
      moreToLoad = await this.loadNextContinuationPage();
      unidentifiedLoadedThreads =
        this.buildBatchUnidentifiedLoadedThreadRoots();
      logger.debug(
        `${unidentifiedLoadedThreads.length} unidentifiedLoadedThreads after loading`,
      );
    }
    //  threadRoots is empty even after loading all we can
    if (unidentifiedLoadedThreads.length === 0) {
      return undefined;
    }
    const batchThreadRoots = unidentifiedLoadedThreads.slice(0, BATCH_SIZE);
    for (const threadRoot of batchThreadRoots) {
      this.batchIdentifiedCommentIds.add(threadRoot.commentId);
    }
    logger.debug(
      `Preparing a batch of ${batchThreadRoots.length} comment threads (among ${unidentifiedLoadedThreads.length} unidentifiedLoadedThreads)`,
    );
    return new YoutubeVideoCommentThreadBatch(batchThreadRoots);
  }

  private buildBatchUnidentifiedLoadedThreadRoots() {
    return this.buildAllThreadRoots().filter(
      (threadRoot) => !this.batchIdentifiedCommentIds.has(threadRoot.commentId),
    );
  }

  private buildAllThreadRoots() {
    return this.scrapingSupport
      .selectAll(
        this.commentsContainer,
        "#contents > ytd-comment-thread-renderer",
        HTMLElement,
      )
      .filter((element) => this.scrapingSupport.isVisible(element))
      .map((element) => ({
        element,
        commentId: this.extractTopLevelCommentId(element),
      }));
  }

  private extractTopLevelCommentId(threadRoot: HTMLElement): string {
    const publishedTimeLink = this.scrapingSupport.selectOrThrow(
      threadRoot,
      "#comment-container #published-time-text a",
      HTMLAnchorElement,
    );
    return extractCommentIdFromCommentHref(publishedTimeLink.href);
  }

  private async loadNextContinuationPage(): Promise<boolean> {
    let continuationElement = this.scrapingSupport.select(
      this.commentsContainer,
      "#continuations",
      HTMLElement,
    );
    if (!continuationElement) {
      return false;
    }
    const beforeLoadCommentIds = new Set(
      this.buildAllThreadRoots().map((tr) => tr.commentId),
    );
    const timeout = 10000;
    const startedAt = Date.now();
    let lastShake = startedAt;
    let continuationMissingSince: number | undefined;
    while (Date.now() - startedAt < timeout) {
      if (continuationElement.isConnected) {
        continuationElement.scrollIntoView({ block: "center" });
      }
      await this.scrapingSupport.resumeHostPage();

      const hasNewCommentThreads = this.buildAllThreadRoots().some(
        (tr) => !beforeLoadCommentIds.has(tr.commentId),
      );
      if (hasNewCommentThreads) {
        // consider loading done when new comment thread appear
        return true;
      }
      const currentContinuation = this.scrapingSupport.select(
        this.commentsContainer,
        "#continuations",
        HTMLElement,
      );
      if (currentContinuation) {
        // FIXME: Do we really track a new continuation replacing another??
        if (currentContinuation !== continuationElement) {
          logger.warn("Replacing continuation element...");
        }
        continuationElement = currentContinuation;
        continuationMissingSince = undefined;
      } else {
        continuationMissingSince ??= Date.now();
        if (Date.now() - continuationMissingSince > 1000) return false;
      }

      if (Date.now() - lastShake > 1000) {
        // "Shake" by scrolling back up and then to element
        document.scrollingElement?.scrollBy({ top: -200 });
        await this.scrapingSupport.sleep(200);
        lastShake = Date.now();
      }
      await this.scrapingSupport.sleep(200);
    }

    logger.debug(`No new top-level comments appeared after ${timeout}ms`);
    return false;
  }
}
