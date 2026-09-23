import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { InstagramCommentsLoader } from "./InstagramCommentsLoader";

import type { InstagramCommentThread } from "./InstagramLoadedCommentThreadsScraper";
import { InstagramLoadedCommentThreadsScraper } from "./InstagramLoadedCommentThreadsScraper";
import {
  createScreenshotProviderForScrollableDescendants,
  EmptyElementScreenshotProvider,
} from "@/shared/screenshoting";
import type { ElementScreenshotProvider } from "@/shared/screenshoting/provider/ElementScreenshotProvider";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";

const logger = createLogger("ig-comment-threads-scraper", scrapingLogger);

export class InstagramCommentThreadsScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private expectedCommentsCount: number,
    private skipScreenshoting: boolean = false,
  ) {}

  async scrapCommentThreads(): Promise<InstagramCommentThread[]> {
    // hr separates the account info from the scrollable section
    // The scrollable section contains a div that  contains 2 or 3 divs:
    // * post info (absent if no text content)
    // * comments sorting menu
    // * comments
    const scrollableSection = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "main hr + div",
      HTMLElement,
    );

    const commentsContainer = this.scrapingSupport.selectOrThrow(
      scrollableSection,
      // Comments are the
      ":scope > div > div:last-of-type",
      HTMLElement,
      {
        parentElementDescriptor: "scrollableSection",
        selectedElementDescriptor: "commentsContainer",
      },
    );

    // Load comment threads
    await new InstagramCommentsLoader(
      this.scrapingSupport,
      this.progressManager.subTaskProgressManager({ from: 0, to: 50 }),
      this.expectedCommentsCount,
      scrollableSection,
      commentsContainer,
    ).loadCommentsAndReplies();

    // Create screenshot provider by screenshoting scrollable container
    // Consider screenshoting to take 50% of time
    const screenshotProvider: ElementScreenshotProvider =
      await this.createScreenshotProvider(
        scrollableSection,
        this.progressManager.subTaskProgressManager({ from: 50, to: 90 }),
      );

    return await new InstagramLoadedCommentThreadsScraper(
      commentsContainer,
      this.scrapingSupport,
      this.progressManager.subTaskProgressManager({
        from: this.skipScreenshoting ? 50 : 90,
        to: 100,
      }),
      screenshotProvider,
    ).scrapLoadedCommentThreads();
  }

  private async createScreenshotProvider(
    scrollableSection: HTMLElement,
    progressManager: ProgressManager,
  ): Promise<ElementScreenshotProvider> {
    if (this.skipScreenshoting) {
      logger.warn(
        "skipScreenshoting=true - using EmptyElementScreenshotProvider",
      );
      return new EmptyElementScreenshotProvider();
    }
    return await createScreenshotProviderForScrollableDescendants(
      scrollableSection,
      this.scrapingSupport,
      progressManager,
    );
  }
}
