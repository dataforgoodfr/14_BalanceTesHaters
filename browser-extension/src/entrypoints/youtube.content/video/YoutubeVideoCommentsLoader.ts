import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";

const logger = createLogger("[CS - YoutubeVideoCommentsLoader]");

const ACTUAL_LOADING_COMMENT_PROGRESS_PERCENT = 80;

export class YoutubeVideoCommentsLoader {
  constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
    private expectedCommentsCount: number,
    private commentsContainer: HTMLElement,
  ) {}

  public async loadCommentsAndReplies() {
    logger.info(
      "Loading comments expecting " + this.expectedCommentsCount + " comments",
    );

    await this.loadAllTopLevelComments();

    logger.debug("Expanding all replies...");
    await this.loadAllReplies();
    this.progressManager.setProgress(ACTUAL_LOADING_COMMENT_PROGRESS_PERCENT);

    logger.debug("Expanding long comments...");
    await this.expandLongComments();
    this.progressManager.setProgress(100);
  }

  private async loadAllTopLevelComments() {
    let previousVisibleCommentsCount = 0;
    let lastCountChange = Date.now();
    let lastShaking = Date.now();
    for (;;) {
      const continuationElement = this.scrapingSupport.select(
        this.commentsContainer,
        "#continuations",
        HTMLElement,
      );
      if (!continuationElement) {
        // No more continuation element
        logger.info(
          "loadAllTopLevelComments - Done: No continuation element found",
        );
        return;
      }
      continuationElement.scrollIntoView({
        block: "center",
      });
      await this.scrapingSupport.resumeHostPage();
      await this.scrapingSupport.waitUntilNoVisibleElementMatches(
        this.commentsContainer,
        "#spinnerContainer.active",
      );
      const visibleCommentsCount = this.countVisibleComments();

      const needsShakingDelay = 1000;
      const assumeDoneDelay = 10000;
      if (visibleCommentsCount !== previousVisibleCommentsCount) {
        this.updateLoadedCommentsProgress(visibleCommentsCount);
        previousVisibleCommentsCount = visibleCommentsCount;
        lastCountChange = Date.now();
      } else if (Date.now() - lastCountChange > assumeDoneDelay) {
        // No new comments loaded in last few seconds
        // Assume we are done
        logger.info(
          `Top level comments loading done: after no changes for ${assumeDoneDelay}ms`,
        );
        return;
      } else if (
        Date.now() - Math.max(lastCountChange, lastShaking) >
        needsShakingDelay
      ) {
        // Sometimes scrollIntoView fails to trigger loading
        // scrolling back up a bit seems to help
        // Is this solved by scorllIntoView with
        logger.info(
          `loadAllTopLevelComments - Nothing changed after ${needsShakingDelay}ms: trying to shake things`,
        );
        document.scrollingElement?.scrollBy({
          top: -200,
        });
        await this.scrapingSupport.sleep(200);
        continuationElement.scrollIntoView();
        await this.scrapingSupport.sleep(200);
        lastShaking = Date.now();
      }
      await this.scrapingSupport.sleep(200);
    }
  }

  private async loadAllReplies() {
    const repliesButton = this.scrapingSupport
      .selectAll(
        this.commentsContainer,
        "#replies #more-replies button" +
          "," +
          "#replies #more-replies-sub-thread button",
        HTMLElement,
      )
      .filter((e) => this.scrapingSupport.isVisible(e));
    logger.debug("Expanding ", repliesButton.length, " replies button...");
    await this.expandReplies(repliesButton);

    // expand more replies button
    const clickedMoreRepliesButtons = new Set<HTMLElement>();
    for (;;) {
      await this.scrapingSupport.resumeHostPage();

      const selectedMoreRepliesButtons = this.scrapingSupport
        .selectAll(
          this.commentsContainer,
          'button[aria-label="Afficher plus de réponses"],' +
            'button[aria-label="Show more replies"]',
          HTMLElement,
        )
        .filter((e) => this.scrapingSupport.isVisible(e));

      const selectedButAlreadyClickedButSelected =
        selectedMoreRepliesButtons.filter((b) =>
          clickedMoreRepliesButtons.has(b),
        );
      if (selectedButAlreadyClickedButSelected.length > 0) {
        logger.warn(
          "Found ",
          selectedButAlreadyClickedButSelected.length,
          " more replies button for which click didn't work!! Ignoring them to avoid infinite loop.",
          selectedButAlreadyClickedButSelected,
        );
      }

      const selectedAndNotYetClicked = selectedMoreRepliesButtons.filter(
        (b) => !clickedMoreRepliesButtons.has(b),
      );

      if (selectedAndNotYetClicked.length === 0) {
        logger.debug(
          "Found 0 more replies button - We're done loading replies.",
        );
        return;
      } else {
        logger.debug(
          "Found ",
          selectedAndNotYetClicked.length,
          " more replies buttons - Expanding them",
        );
        await this.expandReplies(selectedAndNotYetClicked);
        selectedAndNotYetClicked.forEach((b) =>
          clickedMoreRepliesButtons.add(b),
        );
      }
      this.updateLoadedCommentsProgress(this.countVisibleComments());
    }
  }

  private async expandReplies(repliesButton: HTMLElement[]) {
    logger.debug("Loading ", repliesButton.length, " replies...");
    for (const button of repliesButton) {
      button.scrollIntoView();
      button.click();
    }

    // Wait for replies to load
    await this.waitForRepliesToLoad();

    logger.debug("All ", repliesButton.length, "replies loaded");
  }

  private async expandLongComments() {
    const readMoreButton = this.scrapingSupport
      .selectAll(this.commentsContainer, "#more", HTMLElement)
      .filter((e) => this.scrapingSupport.isVisible(e));
    logger.debug("Expanding ", readMoreButton.length, " read more buttons...");
    for (const b of readMoreButton) {
      b.scrollIntoView();
      b.click();
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private async waitForRepliesToLoad(): Promise<number> {
    await this.scrapingSupport.sleep(300);

    const timeoutPerElement = 5000;
    const start = Date.now();
    const listGhostSections = () => {
      return this.scrapingSupport
        .selectAll(
          this.commentsContainer,
          "#ghost-comment-section",
          HTMLElement,
        )
        .filter((e) => this.scrapingSupport.isVisible(e));
    };
    const initialGhostSectionsCount = listGhostSections().length;
    let maxDate: number =
      Date.now() + initialGhostSectionsCount * timeoutPerElement;

    for (;;) {
      const remaingGhostSections = listGhostSections();
      const remainingGhostSectionsCount = remaingGhostSections.length;
      if (remainingGhostSectionsCount === 0) {
        return remainingGhostSectionsCount;
      }
      logger.debug(
        ` ${remainingGhostSectionsCount}/${initialGhostSectionsCount} still present after ${Date.now() - start}ms.`,
      );
      if (Date.now() > maxDate) {
        // Assuming we are facing broken replies loading.
        // See https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/304
        logger.warn(
          `Adaptive timeout reached after ${Date.now() - start}ms. Assuming broken replies loading.`,
        );
        return remainingGhostSectionsCount;
      }
      const newDateForRemainingElements =
        Date.now() + remainingGhostSectionsCount * timeoutPerElement;
      if (newDateForRemainingElements < maxDate) {
        // Decrease max Date if elements where solved faster than timeout per element
        maxDate = newDateForRemainingElements;
      }

      for (const el of remaingGhostSections) {
        el.scrollIntoView();
        await this.scrapingSupport.resumeHostPage();
      }
      await this.scrapingSupport.sleep(500);

      this.updateLoadedCommentsProgress(this.countVisibleComments());
    }
  }

  private countVisibleComments() {
    return this.scrapingSupport
      .selectAll(this.commentsContainer, "#comment-container", HTMLElement)
      .filter((e) => this.scrapingSupport.isVisible(e)).length;
  }

  private updateLoadedCommentsProgress(loadedCommentsCount: number) {
    const percentOfExpectedTotal = (
      (100 * loadedCommentsCount) /
      this.expectedCommentsCount
    ).toFixed(1);
    logger.debug(
      `${loadedCommentsCount} comments loaded (${percentOfExpectedTotal}% of expected total ${this.expectedCommentsCount})`,
    );
    const progress =
      (ACTUAL_LOADING_COMMENT_PROGRESS_PERCENT * loadedCommentsCount) /
      this.expectedCommentsCount;
    this.progressManager.setProgress(progress);
  }
}
