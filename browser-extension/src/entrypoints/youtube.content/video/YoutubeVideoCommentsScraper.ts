import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import { YoutubeVideoCommentsLoader } from "./YoutubeVideoCommentsLoader";
import type { CommentSnapshot } from "@/shared/model/PostSnapshot";
import {
  createScreenshotProviderForDocument,
  type ElementScreenshotProvider,
} from "@/shared/screenshoting";
import { withRetry } from "@/shared/utils/withRetry";
import { ObsoleteScreenshotError } from "@/shared/screenshoting/provider/ElementScreenshotProvider";
import { YoutubeVideoLoadedCommentsScraper } from "./YoutubeVideoLoadedCommentsScraper";

const logger = createLogger("yt-comments", scrapingLogger);

export class YoutubeVideoCommentsScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private commentsContainer: HTMLElement,
    private expectedCommentsCount: number,
  ) {}

  public async scrapComments(): Promise<CommentSnapshot[]> {
    if (this.expectedCommentsCount === 0) return [];
    // Sort by newest to esnure all are loaded
    // Otherwise only most popular are displayed
    await this.sortCommentsByNewest();

    await new YoutubeVideoCommentsLoader(
      this.scrapingSupport,
      this.progressManager.subTaskProgressManager({ from: 0, to: 50 }),
      this.expectedCommentsCount,
      this.commentsContainer,
    ).loadCommentsAndReplies();

    return this.scrapLoadedComments();
  }

  private async scrapLoadedComments(): Promise<CommentSnapshot[]> {
    // Hide matshead overlay that otherwise is screenshoted of top of elements
    const masthead = this.scrapingSupport.selectOrThrow(
      document,
      "#masthead-container",
      HTMLElement,
    );
    masthead.style.visibility = "hidden";
    await this.scrapingSupport.resumeHostPage();

    try {
      return await withRetry({
        maxAttempts: 10,
        retryOn: (e) => e instanceof ObsoleteScreenshotError,
        beforeRetry: ({ remainingAttempts }) => {
          logger.warn(
            "Window Resized - restarting scrapLoadedComments remainingAttempts:",
            remainingAttempts,
          );
        },
        retry: async () => {
          const screenshotProvider: ElementScreenshotProvider =
            await createScreenshotProviderForDocument(
              this.scrapingSupport,
              this.progressManager.subTaskProgressManager({ from: 50, to: 90 }),
            );

          const comments = await new YoutubeVideoLoadedCommentsScraper(
            this.commentsContainer,
            this.scrapingSupport,
            screenshotProvider,
            this.expectedCommentsCount,
            this.progressManager.subTaskProgressManager({ from: 90, to: 100 }),
          ).scrapLoadedCommentThreads();
          return comments;
        },
      });
    } finally {
      masthead.style.visibility = "visible";
      await this.scrapingSupport.resumeHostPage();
    }
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

    // Wait for loading using previous sort method to finish
    // Track spinner disappearing
    await this.scrapingSupport.waitUntilNoVisibleElementMatches(
      this.commentsContainer,
      "#spinnerContainer.active",
    );

    // Do change the sort to by newest
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
    // Wait for initial comments loading using new sort method
    await this.scrapingSupport.waitUntilNoVisibleElementMatches(
      this.commentsContainer,
      "#spinnerContainer.active",
    );
  }
}
