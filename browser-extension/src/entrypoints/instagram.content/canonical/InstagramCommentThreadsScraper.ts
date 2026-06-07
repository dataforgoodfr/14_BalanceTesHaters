import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { InstagramCommentsLoader } from "./InstagramCommentsLoader";

import {
  InstagramCommentThread,
  InstagramLoadedCommentThreadsScraper,
} from "./InstagramLoadedCommentThreadsScraper";
import { createScreenshotProviderForScrollableDescendants } from "@/shared/screenshoting";
import { ElementScreenshotProvider } from "@/shared/screenshoting/provider/ElementScreenshotProvider";

export class InstagramCommentThreadsScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private expectedCommentsCount: number,
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
      await createScreenshotProviderForScrollableDescendants(
        scrollableSection,
        this.scrapingSupport,
        this.progressManager.subTaskProgressManager({ from: 50, to: 90 }),
      );

    return await new InstagramLoadedCommentThreadsScraper(
      commentsContainer,
      this.scrapingSupport,
      this.progressManager.subTaskProgressManager({ from: 90, to: 100 }),
      screenshotProvider,
    ).scrapLoadedCommentThreads();
  }
}
