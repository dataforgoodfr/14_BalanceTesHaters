import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import type { InstagramCommentThreadBatch } from "./InstagramCommentThreadBatch";
import {
  VIEW_REPLIES_BUTTON_TEXT_REGEX,
  HIDE_REPLIES_BUTTON_TEXT_REGEX,
} from "./instagramElementsTexts";

const logger = createLogger("ig-thread-content-loader", scrapingLogger);
const REPLY_LOADING_TIMEOUT_MS = 30_000;

type ThreadLoadingState = {
  beforeExpandReplyCount: number;
  startedAt: number;
  sawLoading: boolean;
};

type BatchThreadLoadingState = Map<HTMLElement, ThreadLoadingState>;

export class InstagramCommentThreadContentLoader {
  constructor(private readonly scrapingSupport: ScrapingSupport) {}

  async loadReplies(batch: InstagramCommentThreadBatch): Promise<void> {
    const pendingThreadLoadingState: BatchThreadLoadingState = new Map();
    let lastProgressAt = Date.now();
    let settledAt: number | undefined;
    let previousReplyCount = this.countReplies(batch);
    for (;;) {
      this.scrapingSupport.throwIfAborted();
      const replyCount = this.countReplies(batch);
      if (replyCount !== previousReplyCount) {
        previousReplyCount = replyCount;
        lastProgressAt = Date.now();
        settledAt = undefined;
      }
      await this.startExpandingViewRepliesButtons(
        batch,
        pendingThreadLoadingState,
      );
      if (this.updatePendingThreadRepliesLoading(pendingThreadLoadingState)) {
        lastProgressAt = Date.now();
        settledAt = undefined;
      }
      if (!this.hasPendingReplies(batch, pendingThreadLoadingState)) {
        settledAt ??= Date.now();
        if (Date.now() - settledAt >= 1_000) return;
      } else {
        settledAt = undefined;
      }
      if (Date.now() - lastProgressAt >= REPLY_LOADING_TIMEOUT_MS) {
        throw new Error(
          `Timed out waiting for Instagram replies after ${REPLY_LOADING_TIMEOUT_MS}ms without progress.`,
        );
      }
      await this.scrapingSupport.sleep(200);
    }
  }

  private async startExpandingViewRepliesButtons(
    batch: InstagramCommentThreadBatch,
    pending: BatchThreadLoadingState,
  ): Promise<void> {
    for (const { thread, button } of this.selectViewRepliesButtons(batch)) {
      if (pending.has(thread) || this.isLoading(thread)) continue;
      // Record the count before clicking so immediate replies are detected.
      pending.set(thread, {
        beforeExpandReplyCount: this.countThreadReplies(thread),
        startedAt: Date.now(),
        sawLoading: false,
      });
      logger.debug("Expanding reply group");
      await this.scrapingSupport.click(button);
    }
  }

  private updatePendingThreadRepliesLoading(
    pending: BatchThreadLoadingState,
  ): boolean {
    let progressed = false;
    for (const [thread, request] of pending) {
      if (this.isThreadRepliesLoadingComplete(thread, request)) {
        pending.delete(thread);
        progressed = true;
      }
    }
    return progressed;
  }

  private isThreadRepliesLoadingComplete(
    thread: HTMLElement,
    request: ThreadLoadingState,
  ): boolean {
    const loading = this.isLoading(thread);
    request.sawLoading ||= loading;
    if (
      !loading &&
      (this.countThreadReplies(thread) !== request.beforeExpandReplyCount ||
        request.sawLoading)
    ) {
      return true;
    }
    if (Date.now() - request.startedAt < REPLY_LOADING_TIMEOUT_MS) return false;

    // Instagram can expand a group without returning displayable replies.
    // Wait the full response window, then keep the visible comments.
    if (!loading && this.hasHideRepliesButton(thread)) {
      logger.warn(
        "Expanded Instagram reply group returned no visible replies after 30s",
      );
      return true;
    }
    throw new Error(
      `Timed out waiting for Instagram replies after ${REPLY_LOADING_TIMEOUT_MS}ms without progress.`,
    );
  }

  private hasPendingReplies(
    batch: InstagramCommentThreadBatch,
    pending: BatchThreadLoadingState,
  ): boolean {
    return (
      pending.size > 0 ||
      batch.threadElements.some((thread) => this.isLoading(thread)) ||
      this.selectViewRepliesButtons(batch).length > 0
    );
  }

  private isLoading(thread: HTMLElement): boolean {
    return thread.querySelector("[role='progressbar']") !== null;
  }

  private hasHideRepliesButton(thread: HTMLElement): boolean {
    return (
      this.scrapingSupport.selectAll(thread, "[role='button']", HTMLElement, {
        predicate: (button) =>
          HIDE_REPLIES_BUTTON_TEXT_REGEX.test(button.innerText),
      }).length > 0
    );
  }

  private countThreadReplies(thread: HTMLElement): number {
    return thread.querySelectorAll(":scope > div:nth-of-type(2) > ul > div")
      .length;
  }

  private countReplies(batch: InstagramCommentThreadBatch): number {
    return batch.threadElements.reduce(
      (count, thread) => count + this.countThreadReplies(thread),
      0,
    );
  }

  private selectViewRepliesButtons(
    batch: InstagramCommentThreadBatch,
  ): { thread: HTMLElement; button: HTMLElement }[] {
    return batch.threadElements.flatMap((threadElement) =>
      this.scrapingSupport
        .selectAll(threadElement, "[role='button']", HTMLElement, {
          predicate: (button) =>
            VIEW_REPLIES_BUTTON_TEXT_REGEX.test(button.innerText),
        })
        .map((button) => ({ thread: threadElement, button })),
    );
  }
}
