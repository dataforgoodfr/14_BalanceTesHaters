import type { CommentsScrapingResult } from "@/shared/model/scraping/CommentsScrapingResult";
import {
  countAllComments,
  type CommentSnapshot,
} from "@/shared/model/PostSnapshot";
import { detachCommentScreenshots } from "@/shared/model/scraping/CommentSnapshotWithScreenshot";
import {
  ElementDescendantsScreenshotProvider,
  EmptyElementScreenshotProvider,
  type ElementScreenshotProvider,
} from "@/shared/screenshoting";
import type { ScrapingScreenshots } from "@/shared/model/scraping/ScrapingScreenshots";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import { InstagramCommentThreadBatchLoader } from "./InstagramCommentThreadBatchLoader";
import { InstagramLoadedCommentThreadBatchScraper } from "./InstagramLoadedCommentThreadBatchScraper";
import { InstagramCommentThreadContentLoader } from "./InstagramCommentThreadContentLoader";
import { InstagramCommentFilter } from "./InstagramCommentFilter";

const logger = createLogger("ig-comment-threads-scraper", scrapingLogger);

export class InstagramCommentThreadsScraper {
  public static readonly DEFAULT_MAX_SCRAPING_COMMENTS = 4000;

  public constructor(
    private readonly scrapingSupport: ScrapingSupport,
    private readonly progressManager: ProgressManager,
    private readonly expectedCommentsCount: number,
    private readonly appendScreenshots: (
      screenshots: ScrapingScreenshots,
    ) => Promise<void>,
    private readonly skipScreenshoting = false,
    private readonly maxScrapingComments = InstagramCommentThreadsScraper.DEFAULT_MAX_SCRAPING_COMMENTS,
  ) {}

  async scrapCommentThreads(): Promise<CommentsScrapingResult> {
    const metadata: CommentsScrapingResult["metadata"] = {
      expectedCommentsCount: this.expectedCommentsCount,
      commentsLimit: this.maxScrapingComments,
      limitReached: false,
      filteredCommentsCount: 0,
      screenshotsEnabled: !this.skipScreenshoting,
    };
    const filter = new InstagramCommentFilter();
    try {
      logger.info(
        `Scraping comments (expectedCommentsCount: ${this.expectedCommentsCount}, maxScrapingComments: ${this.maxScrapingComments})`,
      );
      if (this.expectedCommentsCount === 0) return { comments: [], metadata };

      const scrollableSection =
        await this.scrapingSupport.waitForSelectorOrThrow(
          document,
          "main hr + div",
          HTMLElement,
        );
      const commentsContainer = this.scrapingSupport.selectOrThrow(
        scrollableSection,
        ":scope > div > div:last-of-type",
        HTMLElement,
        {
          parentElementDescriptor: "scrollableSection",
          selectedElementDescriptor: "commentsContainer",
        },
      );

      const batchLoader = new InstagramCommentThreadBatchLoader(
        this.scrapingSupport,
        scrollableSection,
        commentsContainer,
      );
      const contentLoader = new InstagramCommentThreadContentLoader(
        this.scrapingSupport,
      );
      const batchScraper = new InstagramLoadedCommentThreadBatchScraper(
        this.scrapingSupport,
        this.createScreenshotProvider(scrollableSection),
      );
      const targetCommentsCount = Math.min(
        this.expectedCommentsCount,
        this.maxScrapingComments,
      );
      const comments: CommentSnapshot[] = [];

      for (;;) {
        const batch = await batchLoader.loadAndIdentifyNextBatch();
        if (batch.threadElements.length === 0) break;

        await contentLoader.loadReplies(batch);
        const commentThreads = await batchScraper.scrapBatch(batch);
        const commentsWithScreenshots = filter.filterThreads(commentThreads);
        const { comments: batchComments, screenshots } =
          detachCommentScreenshots(commentsWithScreenshots);
        await this.appendScreenshots(screenshots);
        comments.push(...batchComments);

        const scrapedCommentsCount = countAllComments(comments);
        this.progressManager.setProgress(
          (100 * scrapedCommentsCount) / targetCommentsCount,
        );
        logger.info(
          `Scraped ${countAllComments(batchComments)} comments in batch`,
        );
        await this.scrapingSupport.resumeHostPage();

        if (scrapedCommentsCount >= this.maxScrapingComments) {
          metadata.limitReached = true;
          logger.warn(
            `Maximum number of comments reached ${this.maxScrapingComments}. Stopping`,
          );
          break;
        }
      }

      this.progressManager.setProgress(100);
      metadata.filteredCommentsCount = filter.getStats().totalFilteredComments;
      return { comments, metadata };
    } finally {
      logger.info("Filtered Instagram comment elements", filter.getStats());
    }
  }

  private createScreenshotProvider(
    scrollableContainer: HTMLElement,
  ): ElementScreenshotProvider {
    if (this.skipScreenshoting) {
      logger.warn(
        "skipScreenshoting=true - using EmptyElementScreenshotProvider",
      );
      return new EmptyElementScreenshotProvider();
    }
    return new ElementDescendantsScreenshotProvider(
      scrollableContainer,
      this.scrapingSupport,
    );
  }
}
