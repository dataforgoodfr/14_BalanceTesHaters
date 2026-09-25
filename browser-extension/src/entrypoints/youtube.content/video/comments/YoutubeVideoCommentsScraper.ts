import { countAllComments } from "@/shared/model/PostSnapshot";
import type { CommentSnapshotWithScreenshot } from "@/shared/model/PostScrapingResult";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { YoutubeVideoCommentThreadBatchScraper } from "./YoutubeVideoCommentThreadBatchScraper";
import { YoutubeVideoCommentThreadContentLoader } from "./YoutubeVideoCommentThreadContentLoader";
import { YoutubeVideoCommentThreadBatchLoader } from "./YoutubeVideoCommentThreadBatchLoader";
import { ytBaseLogger } from "../../ytBaseLogger";

const logger = createLogger("comments", ytBaseLogger);

export class YoutubeVideoCommentsScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private commentsContainer: HTMLElement,
    private expectedCommentsCount: number,
    private skipScreenshoting: boolean = false,
  ) {}

  public async scrapComments(): Promise<CommentSnapshotWithScreenshot[]> {
    logger.info(
      `Scraping comments (expectedCommentsCount: ${this.expectedCommentsCount})...`,
    );
    if (this.expectedCommentsCount === 0) return [];
    // Sort by newest so the continuation contains every comment, not a ranked sample.
    await this.sortCommentsByNewest();

    const batchLoader = new YoutubeVideoCommentThreadBatchLoader(
      this.commentsContainer,
      this.scrapingSupport,
    );
    const threadContentLoader = new YoutubeVideoCommentThreadContentLoader(
      this.scrapingSupport,
    );
    const batchScraper = new YoutubeVideoCommentThreadBatchScraper(
      this.scrapingSupport,
      this.progressManager,
      this.expectedCommentsCount,
      this.skipScreenshoting,
    );
    const comments: CommentSnapshotWithScreenshot[] = [];

    for (;;) {
      logger.info("Loading next batch...");

      const batch = await batchLoader.loadAndIdentifyNextBatch();
      if (!batch) {
        logger.info("No more batch...");
        break;
      }

      logger.info(
        `Loading content for batch ${batch.threadRoots.length} threads ...`,
      );
      for (const threadRoot of batch.threadRoots) {
        await threadContentLoader.loadThreadContent(threadRoot);
      }

      logger.info(`Scraping batch content...`);
      const batchComments = await batchScraper.scrapBatch(batch);
      const allCommentsCount = countAllComments(batchComments);
      logger.info(
        `Scraped ${allCommentsCount} comments in batch (in ${batchComments.length} roots)`,
      );

      comments.push(...batchComments);

      await this.scrapingSupport.resumeHostPage();
    }

    this.progressManager.setProgress(100);
    return comments;
  }

  private async sortCommentsByNewest(): Promise<void> {
    const sortMenu = await this.scrapingSupport.waitForSelectorOrThrow(
      this.commentsContainer,
      "#sort-menu",
      HTMLElement,
    );
    if (!sortMenu || !this.scrapingSupport.isVisible(sortMenu)) {
      logger.warn("Sort menu not found");
      return;
    }
    sortMenu.scrollIntoView();
    await this.scrapingSupport.resumeHostPage();

    await this.scrapingSupport.waitUntilNoVisibleElementMatches(
      this.commentsContainer,
      "#spinnerContainer.active",
    );

    this.scrapingSupport
      .selectOrThrow(sortMenu, "#trigger", HTMLElement)
      .click();
    (
      await this.scrapingSupport.waitForSelectorOrThrow(
        sortMenu,
        "a:nth-child(2)",
        HTMLElement,
      )
    ).click();
    await this.scrapingSupport.resumeHostPage();
    await this.scrapingSupport.waitUntilNoVisibleElementMatches(
      this.commentsContainer,
      "#spinnerContainer.active",
    );
  }
}
