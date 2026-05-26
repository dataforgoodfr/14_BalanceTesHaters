import {
  isRequestRedirectAndScrap,
  SocialNetworkScraper,
} from "./SocialNetworkScraper";
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
import { sendSubmitClassificationRequestMessage } from "@/entrypoints/background/classification/submitClassificationForPostMessage";
import { sendGetSenderInfoMessage } from "@/entrypoints/background/getSenderInfo";

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
      void this.getPageInfo().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsScrapTabMessage(message)) {
      void this.scrapPost().then(sendResponse);
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

          console.info(
            `[SCS] - Scraping running - progress: ${roundedProgress}% - duration ${durationSec} seconds`,
          );
          this.scrapingStatus = {
            type: "running",
            progress: roundedProgress,
          };
        }),
      );
      if (isRequestRedirectAndScrap(scrapResult)) {
        console.info("[SCS] - Scraper requested a page reload and restart");
        // location.assign will stop the content script context
        await this.storeOnInitScrapingFlag();

        window.location.assign(scrapResult.redirectUrl);
        return {
          type: "failed",
          errorMessage:
            // TODO review scrapPost api to stop assuming result is returned or to return a new type continued-afte-reload
            "Reloading page => content script will not be able to propagate context need to review API",
        };
      }
      console.info("[SCS] - Scraping completed");

      // Store post snapshot
      console.info("[SCS] - Storing post snapshot");
      const postSnapshot = scrapResult;
      await insertPostSnapshot(postSnapshot);

      console.info("[SCS] - Submit for classification");
      // Request background to submit to backend without awaiting
      // If this fails it will be recovered by background polling
      void sendSubmitClassificationRequestMessage(postSnapshot.id);

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
        const errorMessage =
          e instanceof Error && e.stack
            ? `${e.message}\n${e.stack}`
            : String(e);
        this.scrapAbortController = null;
        this.scrapingStatus = scrapingFailed(errorMessage);
        return this.scrapingStatus;
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
      console.info("[SCS] - No scraping in progress to cancel");
      return;
    }
    console.info("[SCS] - Canceling scraping");
    this.scrapAbortController.abort(ABORT_CANCEL_SCRAPING_REASON);
  }

  public initialize() {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    void this.handleOnStartScraping();
  }
}
