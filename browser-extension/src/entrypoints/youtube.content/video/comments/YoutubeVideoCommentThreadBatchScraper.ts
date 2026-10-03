import type { CommentSnapshotWithScreenshot } from "@/shared/model/PostScrapingResult";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  createScreenshotProviderForDocumentArea,
  EmptyElementScreenshotProvider,
  type ElementScreenshotProvider,
} from "@/shared/screenshoting";
import { ObsoleteScreenshotError } from "@/shared/screenshoting/provider/ElementScreenshotProvider";
import { createLogger } from "@/shared/utils/createLogger";
import { withRetry } from "@/shared/utils/withRetry";
import type { YoutubeVideoCommentThreadBatch } from "./YoutubeVideoCommentThreadBatch";
import { YoutubeVideoLoadedCommentsScraper } from "./YoutubeVideoLoadedCommentsScraper";
import { ytBaseLogger } from "../../ytBaseLogger";

const logger = createLogger("batch-scraper", ytBaseLogger);

export class YoutubeVideoCommentThreadBatchScraper {
  private readonly collectedCommentIds = new Set<string>();

  constructor(
    private readonly scrapingSupport: ScrapingSupport,
    private readonly progressManager: ProgressManager,
    private readonly targetCommentsCount: number,
    private readonly skipScreenshoting: boolean = false,
  ) {}

  async scrapBatch(
    batch: YoutubeVideoCommentThreadBatch,
  ): Promise<CommentSnapshotWithScreenshot[]> {
    const threadElements = batch.threadRoots.map(
      (threadRoot) => threadRoot.element,
    );
    // Hide masthead to avoid having it overlaping comments
    const masthead = this.scrapingSupport.selectOrThrow(
      document,
      "#masthead-container",
      HTMLElement,
    );
    masthead.style.visibility = "hidden";
    await this.scrapingSupport.resumeHostPage();

    try {
      const result = await withRetry({
        maxAttempts: 10,
        retryOn: (error) => error instanceof ObsoleteScreenshotError,
        beforeRetry: ({ remainingAttempts }) => {
          logger.warn(
            `Window resized while scraping a batch. ${remainingAttempts} attempts remain`,
          );
        },
        retry: async () => {
          const attemptCommentIds = new Set(this.collectedCommentIds);
          const screenshotProvider =
            await this.createScreenshotProvider(threadElements);
          const comments = await new YoutubeVideoLoadedCommentsScraper(
            this.scrapingSupport,
            screenshotProvider,
            this.targetCommentsCount,
            this.progressManager,
            attemptCommentIds,
          ).scrapRootCommentThreads(threadElements);
          return { comments, attemptCommentIds };
        },
      });

      for (const commentId of result.attemptCommentIds) {
        this.collectedCommentIds.add(commentId);
      }

      return result.comments;
    } finally {
      masthead.style.visibility = "visible";
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private async createScreenshotProvider(
    threadElements: HTMLElement[],
  ): Promise<ElementScreenshotProvider> {
    if (this.skipScreenshoting) {
      logger.warn(
        "skipScreenshoting=true - using EmptyElementScreenshotProvider",
      );
      return new EmptyElementScreenshotProvider();
    }
    return createScreenshotProviderForDocumentArea(
      threadElements,
      this.scrapingSupport,
      new ProgressManager(() => undefined),
    );
  }
}
