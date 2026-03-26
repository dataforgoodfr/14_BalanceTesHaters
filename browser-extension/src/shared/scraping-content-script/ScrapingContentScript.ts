import { SocialNetworkScraper } from "./SocialNetworkScraper";
import { ScrapingResult } from "./ScrapTabResult";
import {
  isScsPageInfoMessage,
  isScsScrapTabMessage,
  isScsGetScrapingStatusMessage,
  isScsCancelScrapTabMessage,
} from "./messages";
import { insertPostSnapshot } from "@/shared/storage/post-snapshot-storage";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import { countAllComments } from "@/shared/model/PostSnapshot";
import {
  isScrapingStartable,
  scrapingFailed,
  ScrapingStatus,
} from "./ScrapingStatus";
import { ProgressManager } from "./ProgressManager";

const ABORT_CANCEL_SCRAPING_REASON = Symbol("CANCEL_SCRAPING");

export class ScrapingContentScript {
  private scrapingStatus: ScrapingStatus = { type: "not-started" };
  private scrapAbortController: AbortController | null = null;

  constructor(private readonly scraper: SocialNetworkScraper) {}

  /**
   * Handle scrapers shared messages.
   * Returned value conforms to webext message handling:
   * * true to indicate that message is handled and async response is returned
   * * undefined to indicate message not handled so that another listener can respond
   * See https://developer.chrome.com/docs/extensions/develop/concepts/messaging#responses
   * @param message
   * @param sender
   * @param sendResponse
   * @returns
   */
  public handleMessage(
    message: unknown,
    _: Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): true | undefined {
    if (isScsPageInfoMessage(message)) {
      this.getPageInfo().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsScrapTabMessage(message)) {
      this.scrapPost().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsGetScrapingStatusMessage(message)) {
      this.getScrapingStatus().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsCancelScrapTabMessage(message)) {
      this.cancelScraping().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    }
  }

  private getPageInfo(): Promise<SocialNetworkPageInfo> {
    return this.scraper.getSocialNetworkPageInfo();
  }

  private getScrapingStatus(): Promise<ScrapingStatus> {
    return Promise.resolve(this.scrapingStatus);
  }

  private async scrapPost(): Promise<ScrapingResult> {
    const pageInfo = await this.getPageInfo();
    if (!pageInfo.isScrapablePost) {
      console.error("[SCS] - Page not scrapable");
      return scrapingFailed("Page not scrapable");
    }
    if (!isScrapingStartable(this.scrapingStatus)) {
      console.error("[SCS] - Scraping is already running");
      return scrapingFailed("Scraping is already running");
    }
    console.info("[SCS] - Start scraping");
    this.scrapAbortController = new AbortController();
    try {
      this.scrapingStatus = {
        type: "running",
        progress: 0,
      };
      const start = Date.now();
      const postSnapshot = await this.scraper.scrapPagePost(
        this.scrapAbortController.signal,
        new ProgressManager((progress) => {
          if (this.scrapingStatus.type !== "running") {
            // Not running anymore
            // Probably canceling
            return;
          }
          const roundedProgress = Math.round(progress);
          const durationSec = Math.round((Date.now() - start) / 1000);

          console.info(
            `[SCS] - Scraping running - progress: ${roundedProgress}% - duration ${durationSec} seconds`,
          );
          this.scrapingStatus = {
            type: "running",
            progress: roundedProgress,
          };
        }),
      );
      console.info("[SCS] - Scraping completed");

      // Store post snapshot
      console.info("[SCS] - Storing post snapshot");
      await insertPostSnapshot(postSnapshot);
      const end = Date.now();
      const durationMs = end - start;
      const topLevelCommentCounts = postSnapshot.comments.length;
      const allCommentsCount = countAllComments(postSnapshot.comments);
      const durationSec = Math.round(durationMs / 1000);
      console.info(
        `[SCS] - Scraping took: ${durationSec} seconds for ${allCommentsCount} comments (${topLevelCommentCounts} top level)`,
      );
      this.scrapingStatus = {
        type: "succeeded",
        postSnapshotId: postSnapshot.id,
        durationMs: durationMs,
      };
      this.scrapAbortController = null;
      return this.scrapingStatus;
    } catch (e) {
      if (e === ABORT_CANCEL_SCRAPING_REASON) {
        // AbortSignal.throwIfAborted throws the reason when aborted
        console.info(
          "[SCS] - Scraping was cancelled",
          e,
          " typeof e",
          typeof e,
        );
        this.scrapAbortController = null;
        this.scrapingStatus = {
          type: "canceled",
        };
        return this.scrapingStatus;
      } else {
        console.error("[SCS] - Unexpected error while scraping", e);
        const errorMessage = String(e);
        this.scrapAbortController = null;
        this.scrapingStatus = scrapingFailed(errorMessage);
        return this.scrapingStatus;
      }
    }
  }

  private async cancelScraping(): Promise<void> {
    if (this.scrapingStatus.type !== "running" || !this.scrapAbortController) {
      console.info("[SCS] - No scraping in progress to cancel");
      return;
    }
    console.info("[SCS] - Canceling scraping");
    this.scrapAbortController.abort(ABORT_CANCEL_SCRAPING_REASON);
  }

  public registerListener() {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }
}
