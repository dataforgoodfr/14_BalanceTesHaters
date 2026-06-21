import {
  isRequestRedirectAndScrap,
  SocialNetworkScraper,
} from "./SocialNetworkScraper";
import { StartScrapingResult } from "./StartScrapingResult";
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
import { sendSubmitClassificationRequestMessage } from "@/entrypoints/background/classification/submitClassificationForPostMessage";
import { sendGetSenderInfoMessage } from "@/entrypoints/background/getSenderInfo";
import { createLogger } from "../utils/createLogger";

const ABORT_CANCEL_SCRAPING_REASON = Symbol("CANCEL_SCRAPING");

const logger = createLogger("[CS - SCS]");
const START_SCRAPING_LOG = "Received start scraping message - start scraping";
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
      void this.getPageInfo().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsScrapTabMessage(message)) {
      logger.info(START_SCRAPING_LOG);

      // Start scraping
      void this.scrapPost();
      // Answer started
      sendResponse({
        type: "started",
      } as StartScrapingResult);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsGetScrapingStatusMessage(message)) {
      void this.getScrapingStatus().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsCancelScrapTabMessage(message)) {
      this.cancelScraping();
      sendResponse();
      return;
    }
  }

  public async handleOnStartScraping() {
    if (await this.hasOnInitScrapFlag()) {
      logger.info("hasOnInitScrapFlag => start scraping");
      await this.clearOnInitScrapFlag();
      await this.scrapPost();
    }
  }

  private getPageInfo(): Promise<SocialNetworkPageInfo> {
    return this.scraper.getSocialNetworkPageInfo();
  }

  private getScrapingStatus(): Promise<ScrapingStatus> {
    return Promise.resolve(this.scrapingStatus);
  }

  private async scrapPost(): Promise<void> {
    const pageInfo = await this.getPageInfo();
    if (!pageInfo.isScrapablePost) {
      logger.error("Page not scrapable");
      return;
    }
    if (!isScrapingStartable(this.scrapingStatus)) {
      logger.error("Scraping is already running");
      return;
    }
    logger.info("Start scraping");
    this.scrapAbortController = new AbortController();
    try {
      this.scrapingStatus = {
        type: "running",
        progress: 0,
      };
      const start = Date.now();
      const scrapResult = await this.scraper.scrapPagePost(
        this.scrapAbortController.signal,
        new ProgressManager((progress) => {
          if (this.scrapingStatus.type !== "running") {
            // Not running anymore
            // Probably canceling
            return;
          }
          const roundedProgress = Math.round(progress);
          const durationSec = Math.round((Date.now() - start) / 1000);

          logger.info(
            `Scraping running - progress: ${roundedProgress}% - duration ${durationSec} seconds`,
          );
          this.scrapingStatus = {
            type: "running",
            progress: roundedProgress,
          };
        }),
      );
      if (isRequestRedirectAndScrap(scrapResult)) {
        logger.info("Scraper requested a page reload and restart");
        // location.assign will stop the content script context
        // We need to store that scraping needs to restart
        await this.storeOnInitScrapingFlag();

        window.location.assign(scrapResult.redirectUrl);
        return;
      }
      logger.info("Scraping completed");

      // Store post snapshot
      logger.info("Storing post snapshot");
      const postSnapshot = scrapResult;
      await insertPostSnapshot(postSnapshot);

      logger.info("Submit for classification");
      // Request background to submit to backend without awaiting
      // If this fails it will be recovered by background polling
      void sendSubmitClassificationRequestMessage(postSnapshot.id);

      const end = Date.now();
      const durationMs = end - start;
      const topLevelCommentCounts = postSnapshot.comments.length;
      const allCommentsCount = countAllComments(postSnapshot.comments);
      const durationSec = Math.round(durationMs / 1000);
      logger.info(
        `Scraping took: ${durationSec} seconds for ${allCommentsCount} comments (${topLevelCommentCounts} top level)`,
      );

      this.scrapingStatus = {
        type: "succeeded",
        postSnapshotId: postSnapshot.id,
        durationMs: durationMs,
      };
      this.scrapAbortController = null;

      return;
    } catch (e) {
      if (e === ABORT_CANCEL_SCRAPING_REASON) {
        // AbortSignal.throwIfAborted throws the reason when aborted
        logger.info("Scraping was cancelled", e, " typeof e", typeof e);
        this.scrapAbortController = null;
        this.scrapingStatus = {
          type: "canceled",
        };
        return;
      } else {
        logger.error("Unexpected error while scraping", e);
        const errorMessage =
          e instanceof Error && e.stack
            ? `${e.message}\n${e.stack}`
            : String(e);
        this.scrapAbortController = null;
        this.scrapingStatus = scrapingFailed(errorMessage);
        return;
      }
    }
  }

  private async storeOnInitScrapingFlag(): Promise<void> {
    const restartStorageKey = await this.onInitScrapFlagStorageKey();
    await browser.storage.local.set({ [restartStorageKey]: true });
  }

  private async clearOnInitScrapFlag(): Promise<void> {
    await browser.storage.local.remove(await this.onInitScrapFlagStorageKey());
  }

  private async hasOnInitScrapFlag(): Promise<boolean> {
    const key = await this.onInitScrapFlagStorageKey();
    const partial = await browser.storage.local.get(key);
    return !!partial[key];
  }

  private async onInitScrapFlagStorageKey() {
    const tabId = (await sendGetSenderInfoMessage()).tabId!;
    const restartStorageKey = "scs-restart-" + tabId;
    return restartStorageKey;
  }

  private cancelScraping(): void {
    if (this.scrapingStatus.type !== "running" || !this.scrapAbortController) {
      logger.info("No scraping in progress to cancel");
      return;
    }
    logger.info("Canceling scraping");
    this.scrapAbortController.abort(ABORT_CANCEL_SCRAPING_REASON);
  }

  public initialize() {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    void this.handleOnStartScraping();
  }
}
