import type { CommentSnapshotWithScreenshot } from "@/shared/model/scraping/CommentSnapshotWithScreenshot";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  DocumentDescendantsScreenshotProvider,
  EmptyElementScreenshotProvider,
  type ElementScreenshotProvider,
} from "@/shared/screenshoting";
import { createLogger } from "@/shared/utils/createLogger";
import type { YoutubeVideoCommentThreadBatch } from "./YoutubeVideoCommentThreadBatch";
import { YoutubeVideoLoadedCommentsScraper } from "./YoutubeVideoLoadedCommentsScraper";
import { ytBaseLogger } from "../../ytBaseLogger";

const logger = createLogger("batch-scraper", ytBaseLogger);

export class YoutubeVideoCommentThreadBatchScraper {
  private readonly collectedCommentIds = new Set<string>();

  constructor(
    private readonly scrapingSupport: ScrapingSupport,
    private readonly globalProgressManager: ProgressManager,
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
      const attemptCommentIds = new Set(this.collectedCommentIds);
      const screenshotProvider = this.createScreenshotProvider();
      const comments = await new YoutubeVideoLoadedCommentsScraper(
        this.scrapingSupport,
        screenshotProvider,
        this.targetCommentsCount,
        this.globalProgressManager,
        attemptCommentIds,
      ).scrapRootCommentThreads(threadElements);

      for (const commentId of attemptCommentIds) {
        this.collectedCommentIds.add(commentId);
      }

      return comments;
    } finally {
      masthead.style.visibility = "visible";
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private createScreenshotProvider(): ElementScreenshotProvider {
    if (this.skipScreenshoting) {
      logger.warn(
        "skipScreenshoting=true - using EmptyElementScreenshotProvider",
      );
      return new EmptyElementScreenshotProvider();
    }
    return new DocumentDescendantsScreenshotProvider(this.scrapingSupport);
  }
}
