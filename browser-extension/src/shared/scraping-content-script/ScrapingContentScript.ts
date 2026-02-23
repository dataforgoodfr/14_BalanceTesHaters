import { SocialNetworkScraper } from "./SocialNetworkScraper";
import { ScrapTabResult } from "./ScrapTabResult";
import { isCsPageInfoMessage, isCsScrapTabMessage } from "./messages";
import { insertPostSnapshot } from "@/shared/storage/post-snapshot-storage";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";

export class ScrapingContentScript {
  private scrapingInProgress: boolean = false;

  constructor(private readonly scraper: SocialNetworkScraper) {}

  public handleMessage(
    message: unknown,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): boolean | undefined {
    if (isCsPageInfoMessage(message)) {
      console.info(`[SCS] - Received ${message.msgType} message from`, sender);
      this.getPageInfo().then(sendResponse);
      return true;
    } else if (isCsScrapTabMessage(message)) {
      console.info(`[SCS] - Received ${message.msgType} message from`, sender);
      this.scrapPost().then(sendResponse);
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
