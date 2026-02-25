import { SocialNetworkScraper } from "./SocialNetworkScraper";
import { ScrapTabResult } from "./ScrapTabResult";
import { isScsPageInfoMessage, isScsScrapTabMessage } from "./messages";
import { insertPostSnapshot } from "@/shared/storage/post-snapshot-storage";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";

export class ScrapingContentScript {
  private scrapingInProgress: boolean = false;

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
    sender: Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): true | undefined {
    if (isScsPageInfoMessage(message)) {
      console.info(`[SCS] - Received ${message.msgType} message from`, sender);
      this.getPageInfo().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    } else if (isScsScrapTabMessage(message)) {
      console.info(`[SCS] - Received ${message.msgType} message from`, sender);
      this.scrapPost().then(sendResponse);
      // Return true to indicate async response to web-ext-messaging
      return true;
    }
  }

  private getPageInfo(): Promise<SocialNetworkPageInfo> {
    return this.scraper.getSocialNetworkPageInfo();
  }

  private async scrapPost(): Promise<ScrapTabResult> {
    const pageInfo = await this.getPageInfo();
    if (!pageInfo.isScrapablePost) {
      console.error("[SCS] - Page not scrapable");
      return {
        type: "error",
        message: "Page not scrapable",
      };
    }
    if (this.scrapingInProgress) {
      console.error("[SCS] - Scraping is already running");
      return {
        type: "error",
        message: "Scraping is already running",
      };
    }
    console.info("[SCS] - Start scraping");
    try {
      this.scrapingInProgress = true;
      const start = Date.now();
      const postSnapshot = await this.scraper.scrapPagePost();
      console.info("[SCS] - Scraping completed");

      // Store post snapshot
      console.info("[SCS] - Storing post snapshot");
      await insertPostSnapshot(postSnapshot);
      const end = Date.now();
      const durationMs = end - start;
      const allCommentsCount = countAllComments(postSnapshot.comments);
      const durationSec = Math.round(durationMs / 1000);
      console.info(
        `[SCS] - Scraping took: ${durationSec} seconds for ${allCommentsCount} comments`,
      );
      return {
        type: "success",
        postSnapshotId: postSnapshot.id,
        durationMs: durationMs,
      };
    } catch (e) {
      console.error("[SCS] - Unexpected error while scraping", e);
      return {
        type: "error",
        message: String(e),
      };
    } finally {
      this.scrapingInProgress = false;
    }
  }

  public registerListener() {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }
}

function countAllComments(comments: CommentSnapshot[]): number {
  let total = comments.length;
  for (const c of comments) {
    total += countAllComments(c.replies);
  }
  return total;
}
