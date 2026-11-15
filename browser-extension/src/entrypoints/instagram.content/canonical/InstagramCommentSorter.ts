import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import {
  COMMENTS_SORT_BUTTON_TEXT_REGEX,
  MOST_RECENT_COMMENTS_TEXT_REGEX,
} from "./instagramElementsTexts";

const logger = createLogger("ig-comment-sorter", scrapingLogger);
const SORT_CONTROL_SELECTOR =
  "main hr + div [role='button'][aria-haspopup='menu']";

export class InstagramCommentSorter {
  constructor(private readonly scrapingSupport: ScrapingSupport) {}

  async sortByMostRecent(): Promise<void> {
    const result = await this.scrapingSupport.waitForSelector(
      document,
      SORT_CONTROL_SELECTOR,
      HTMLElement,
      {
        timeout: 2_000,
        predicate: (button) =>
          COMMENTS_SORT_BUTTON_TEXT_REGEX.test(button.innerText.trim()),
      },
    );
    if (result.status === "failure") {
      logger.info(
        "Instagram comment sorting control unavailable; keeping current order",
      );
      return;
    }
    if (MOST_RECENT_COMMENTS_TEXT_REGEX.test(result.element.innerText.trim())) {
      logger.info("Instagram comments already sorted by most recent");
      return;
    }

    await this.scrapingSupport.click(result.element);
    const menu = await this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "[role='dialog'], [role='menu']",
      HTMLElement,
      {
        predicate: (element) =>
          this.selectMostRecentOption(element) !== undefined,
        selectedElementDescriptor: "commentsSortMenu",
      },
    );
    const option = this.selectMostRecentOption(menu)!;
    await this.selectMostRecentAndWait(option);
    logger.info("Instagram comments sorted by most recent");
  }

  private selectMostRecentOption(menu: HTMLElement): HTMLElement | undefined {
    return this.scrapingSupport.select(
      menu,
      "[role='button'], button, [role='menuitem']",
      HTMLElement,
      {
        predicate: (button) =>
          MOST_RECENT_COMMENTS_TEXT_REGEX.test(button.innerText.trim()),
      },
    );
  }

  private selectDisplayedComments(): HTMLElement[] {
    return this.scrapingSupport.selectAll(
      document,
      "main hr + div > div > div:last-of-type > div",
      HTMLElement,
      {
        predicate: (element) =>
          !element.matches("[aria-hidden='true'], [role='progressbar']") &&
          !element.querySelector("[role='progressbar']") &&
          element.querySelector("time, img") !== null,
      },
    );
  }

  private async selectMostRecentAndWait(option: HTMLElement): Promise<void> {
    const previousContainer = document.querySelector(
      "main hr + div > div > div:last-of-type",
    )!;
    let commentsChangedAt: number | undefined;
    const observer = new MutationObserver((records) => {
      if (
        records.some((record) =>
          this.isCommentsMutation(record, previousContainer),
        )
      ) {
        commentsChangedAt = Date.now();
      }
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    try {
      await this.scrapingSupport.click(option);
      // Instagram reuses rows across sort orders. Wait for comment-list changes
      // and settled, loaded rows instead of requiring old nodes to detach.
      await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        SORT_CONTROL_SELECTOR,
        HTMLElement,
        {
          selectedElementDescriptor: "mostRecentCommentsSortControl",
          predicate: (button) =>
            MOST_RECENT_COMMENTS_TEXT_REGEX.test(button.innerText.trim()) &&
            commentsChangedAt !== undefined &&
            Date.now() - commentsChangedAt >= 500 &&
            this.selectDisplayedComments().length > 0,
        },
      );
    } finally {
      observer.disconnect();
    }
  }

  private isCommentsMutation(
    record: MutationRecord,
    previousContainer: Element,
  ): boolean {
    const currentContainer = document.querySelector(
      "main hr + div > div > div:last-of-type",
    );
    return [previousContainer, currentContainer].some(
      (container) =>
        container !== null &&
        (container.contains(record.target) ||
          [...record.addedNodes, ...record.removedNodes].some((node) =>
            node.contains(container),
          )),
    );
  }
}
