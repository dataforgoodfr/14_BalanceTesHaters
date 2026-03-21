import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "../../shared/utils/current-iso-date";
import { encodePng } from "image-js";

import { ScrapingSupport } from "../../shared/scraping/ScrapingSupport";
import { uint8ArrayToBase64 } from "../../shared/utils/base-64";
import {
  captureFullPageScreenshot,
  FullPageScreenshotResult,
} from "../../shared/native-screenshoting/cs/page-screenshot";
import { PublicationDateTextParsing } from "@/shared/utils/date-text-parsing";
import { Author } from "@/shared/model/Author";
import { youtubePageInfo } from "./youtubePageInfo";
import { extractCommentIdFromCommentHref } from "./extractCommentIdFromCommentHref";
import { extractIsoDateFromPostInfoTooltipText } from "./extractIsoDateFromPostInfoTooltipText";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";

import { withRetry } from "../../shared/utils/withRetry";
const LOG_PREFIX = "[CS - YoutubePostNativeScrapper] ";

/**
 * In a thread, sometimes a comment can not be parsed.
 * In that case there is nothing to scrap => failure.
 */
type CommentThread =
  | { scrapingStatus: "success"; comment: CommentSnapshot }
  | { scrapingStatus: "failure"; message: string };

export class YoutubePostNativeScrapper {
  public constructor(private scrapingSupport: ScrapingSupport) {}

  private debug(...data: typeof console.debug.arguments) {
    console.debug(LOG_PREFIX, ...data);
  }
  private info(...data: typeof console.debug.arguments) {
    console.info(LOG_PREFIX, ...data);
  }
  private warn(...data: typeof console.debug.arguments) {
    console.warn(LOG_PREFIX, ...data);
  }

  async scrapPost(progressManager: ProgressManager): Promise<PostSnapshot> {
    this.info("Start Scraping... ", document.URL);
    const url = document.URL;
    const pageInfo = youtubePageInfo(url);
    if (!pageInfo.isScrapablePost) {
      throw new Error("Current page is not scrapable");
    }
    const scrapTimestamp = currentIsoDate();

    // Pause video to ensure it doesn't autoplay next video during scraping..."
    this.debug("Pause video...");
    this.scrapingSupport
      .selectOrThrow(document, "video", HTMLVideoElement)
      .pause();

    this.debug("Scraping title...");
    const title = await this.scrapPostTitle();
    this.debug(`title: ${title}`);

    this.debug("Scraping author...");
    const author = await this.scrapPostAuthor();
    this.debug(`author.name: ${author.name}`);

    this.debug("Scraping textContent...");
    const textConent = await this.scrapPostTextContent();
    this.debug(`textContent: ${textConent.replaceAll("\n", "")}`);

    this.debug("Scraping publishedAt...");
    const publishedAt = this.scrapPostPublishedAt();
    this.debug(`publishedAt: ${publishedAt}`);

    // Init accounts for 1%
    progressManager.setProgress(1);

    this.debug("Scraping comments...");
    const comments: CommentSnapshot[] = await this.scrapPostComments(
      // Scraping comments accounts for 99% of progress
      progressManager.subTaskProgressManager({ from: 1, to: 100 }),
    );
    this.debug(`${comments.length} comments`);

    return {
      id: crypto.randomUUID(),
      postId: pageInfo.postId,
      socialNetwork: "YOUTUBE",
      scrapedAt: scrapTimestamp,
      coverImageUrl: this.coverImageUrl(pageInfo.postId),
      url: url,
      author: author,
      publishedAt: publishedAt,
      textContent: textConent,
      comments: comments,
      title,
    };
  }

  private scrapPostTitle(): string {
    return this.scrapingSupport.selectOrThrow(
      document,
      ".watch-active-metadata #title",
      HTMLElement,
    ).innerText;
  }

  private scrapPostTextContent() {
    return this.scrapingSupport.selectOrThrow(
      document,
      "#description #snippet-text",
      HTMLElement,
    ).innerText;
  }

  private scrapPostPublishedAt(): PublicationDate {
    const infoElement = this.scrapingSupport.selectOrThrow(
      document,
      "#description #info",
      HTMLElement,
    );
    // Open tooltip by triggering mouseenter
    infoElement.dispatchEvent(
      new MouseEvent("mouseenter", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    const tooltipText = this.scrapingSupport.selectOrThrow(
      document,
      "#description #tooltip",
      HTMLElement,
    ).innerText;
    return {
      type: "absolute",
      date: extractIsoDateFromPostInfoTooltipText(tooltipText),
    };
  }

  private async scrapPostAuthor(): Promise<Author> {
    const channelNameEl = this.scrapingSupport.select(
      document,
      "#owner #channel-name",
      HTMLElement,
    );

    if (channelNameEl && this.scrapingSupport.isVisible(channelNameEl)) {
      const channelName = channelNameEl.innerText;

      const link = this.scrapingSupport.selectOrThrow(
        channelNameEl,
        "a",
        HTMLAnchorElement,
      );
      const channelUrl = link.href;
      return {
        name: channelName,
        accountHref: channelUrl,
      };
    }
    const attributedChannelNameEl = this.scrapingSupport.select(
      document,
      "#owner #attributed-channel-name",
      HTMLElement,
    );
    if (
      attributedChannelNameEl &&
      this.scrapingSupport.isVisible(attributedChannelNameEl)
    ) {
      const channelName = attributedChannelNameEl.innerText;

      const link = this.scrapingSupport.selectOrThrow(
        attributedChannelNameEl,
        "a",
        HTMLAnchorElement,
      );
      const channelUrl = link.href;
      return {
        name: channelName,
        accountHref: channelUrl,
      };
    }
    throw new Error("Failed to scrap post author");
  }

  private async scrapPostComments(
    progressManager: ProgressManager,
  ): Promise<CommentSnapshot[]> {
    const commentsSectionHandle = this.scrapingSupport.selectOrThrow(
      document,
      "#comments",
      HTMLElement,
    );
    commentsSectionHandle.scrollIntoView();

    this.debug("Sorting comments by newest...");
    await this.sortCommentsByNewest();

    await this.loadAllComments(
      progressManager.subTaskProgressManager({ from: 0, to: 50 }),
    );

    const comments = await this.scrapLoadedComments(
      commentsSectionHandle,
      progressManager.subTaskProgressManager({ from: 50, to: 100 }),
    );

    return comments;
  }

  private async scrapLoadedComments(
    commentsSectionHandle: HTMLElement,
    progressManager: ProgressManager,
  ) {
    return withRetry({
      maxAttempts: 10,
      retryOn: (e) => e instanceof WindowResizedSinceScreenshotError,
      beforeRetry: ({ remainingAttempts }) => {
        this.warn(
          "Window Resized - restarting scrapLoadedComments remainingAttempts:",
          remainingAttempts,
        );
      },
      retry: async () => {
        // Wait for at least one to be present
        this.scrapingSupport.waitForSelector(
          commentsSectionHandle,
          "#comment-container",
          HTMLElement,
        );

        this.info("Capturing full page screenshot");
        const fullPageScreenshot = await this.capturePageScreenshot(
          progressManager.subTaskProgressManager({ from: 0, to: 95 }),
        );

        this.info("Capturing comment threads...");
        const threadContainers = this.scrapingSupport.selectAll(
          commentsSectionHandle,
          "#contents > ytd-comment-thread-renderer",
          HTMLElement,
        );
        const comments = this.scrapCommentThreads(
          threadContainers,
          fullPageScreenshot,
        );
        progressManager.setProgress(100);
        this.debug("Comments metada:", comments);
        return comments;
      },
    });
  }

  private async loadAllComments(progressManager: ProgressManager) {
    this.info("Loading all comments...");

    this.debug("Loading top level comments...");
    await this.loadAllTopLevelComments();
    progressManager.setProgress(50);

    this.debug("Expanding all replies...");
    await this.loadAllReplies();
    progressManager.setProgress(75);

    this.debug("Expanding long comments...");
    await this.expandLongComments();
    progressManager.setProgress(100);
  }

  private async scrapCommentThreads(
    threadContainers: HTMLElement[],
    fullPageScreenshot: FullPageScreenshotResult,
  ): Promise<CommentSnapshot[]> {
    return (
      await Promise.all(
        threadContainers.map((threadContainer) =>
          this.scrapCommentThread(threadContainer, fullPageScreenshot),
        ),
      )
    )
      .filter((thread) => thread.scrapingStatus === "success")
      .map((thread) => thread.comment);
  }

  /**
   * This function uses recursion to crawl into the thread of replies.
   * It assumes that the depth of the threads is always below an acceptable threshold.
   *
   * It needs to crop the full page screenshot for every comment
   * in the thread to get their screenshot data.
   */
  private async scrapCommentThread(
    commentThreadContainer: HTMLElement,
    fullPageScreenshot: FullPageScreenshotResult,
  ): Promise<CommentThread> {
    const commentContainer = this.scrapingSupport.selectOrThrow(
      commentThreadContainer,
      "#comment-container",
      HTMLElement,
    );

    // Comments in replies are sometime duplicated in other threads they don't belong to.
    // In that case they are not visible.
    // It occurs for instance in this video: https://www.youtube.com/watch?v=gluz-XXBvTk
    if (!this.scrapingSupport.isVisible(commentContainer)) {
      return {
        scrapingStatus: "failure",
        message: "The comment is not visible",
      };
    }

    const comment = await this.scrapCommentWithoutReplies(
      commentContainer,
      fullPageScreenshot,
    );

    const repliesContainer = this.scrapingSupport.select(
      commentThreadContainer,
      "#replies",
      HTMLElement,
    );

    if (repliesContainer) {
      comment.replies = await this.scrapCommentReplies(
        repliesContainer,
        fullPageScreenshot,
      );
    }

    return {
      comment,
      scrapingStatus: "success",
    };
  }

  private async scrapCommentReplies(
    repliesContainer: HTMLElement,
    fullPageScreenshot: FullPageScreenshotResult,
  ): Promise<CommentSnapshot[]> {
    const expandedThreadsContainer = this.scrapingSupport.select(
      repliesContainer,
      "#expanded-threads",
      HTMLElement,
    );

    // Because of "fix Load replies is unstable",
    // it is possible that the replies have not been rendered yet
    if (!expandedThreadsContainer) {
      return [];
    }

    const repliesThreads = this.scrapingSupport.selectAll(
      expandedThreadsContainer,
      // To avoid capturing comment threads nested a level deeper, use an accurate selector.
      // If you figure out a better selector, feel free to improve this.
      ":scope > yt-sub-thread > .ytSubThreadSubThreadContent > ytd-comment-thread-renderer",
      HTMLElement,
    );

    return this.scrapCommentThreads(repliesThreads, fullPageScreenshot);
  }

  private async capturePageScreenshot(
    progressManager: ProgressManager,
  ): Promise<FullPageScreenshotResult> {
    // Hide matshead overlay that prevent screenshoting elements
    const masthead = this.scrapingSupport.selectOrThrow(
      document,
      "#masthead-container",
      HTMLElement,
    );
    masthead.style.visibility = "hidden";
    await this.scrapingSupport.resumeHostPage();

    try {
      return await captureFullPageScreenshot(
        this.scrapingSupport,
        progressManager,
      );
    } finally {
      masthead.style.visibility = "visible";
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private async sortCommentsByNewest() {
    const sortMenu = await this.scrapingSupport.waitForSelector(
      document,
      "#comments #sort-menu",
      HTMLElement,
    );
    this.scrapingSupport
      .selectOrThrow(sortMenu, "#trigger", HTMLElement)
      .click();

    (
      await this.scrapingSupport.waitForSelector(
        sortMenu,
        "a:nth-child(2)",
        HTMLElement,
      )
    ).click();
  }

  private async loadAllTopLevelComments(): Promise<void> {
    // In youtube a loader is already present at the end of the list of comment
    // Comment actual loading is triggered when the loader is scrolled into view
    // Spinner is disappearing briefly while new comments are rendered

    let previousCommentsCount = undefined;
    let previousSpinnersCount = undefined;
    let lastChangeTime = Date.now();
    for (;;) {
      const spinners = this.scrapingSupport
        .selectAll(document, "#comments #spinner", HTMLElement)
        .filter((e) => this.scrapingSupport.isVisible(e));
      const comments = this.scrapingSupport
        .selectAll(
          document,
          "#comments ytd-comment-thread-renderer",
          HTMLElement,
        )
        .filter((e) => this.scrapingSupport.isVisible(e));
      this.debug("comments:", comments.length, "spinners:", spinners.length);
      if (spinners.length > 0) {
        const lastSpinner = spinners[spinners.length - 1];
        this.debug(
          "Found spinners scroll to last of them to trigger comment loading",
        );
        lastSpinner.scrollIntoView();
      } else if (Date.now() - lastChangeTime > 5000) {
        this.debug(
          "No more spinners found and no changes since more than 10s... consider all comments loaded.",
        );
        return;
      }
      if (
        previousCommentsCount !== comments.length ||
        previousSpinnersCount !== spinners.length
      ) {
        lastChangeTime = Date.now();
        previousCommentsCount = comments.length;
        previousSpinnersCount = spinners.length;
      }
      // Wait a bit to let page load stuff
      await this.scrapingSupport.sleep(200);
    }
  }

  private async loadAllReplies() {
    const repliesButton = this.scrapingSupport
      .selectAll(
        document,
        "#replies #more-replies button" +
          "," +
          "#replies #more-replies-sub-thread button",
        HTMLElement,
      )
      .filter((e) => this.scrapingSupport.isVisible(e));
    this.debug("Expanding ", repliesButton.length, " replies button...");
    for (const b of repliesButton) {
      b.scrollIntoView();
      b.click();
    }

    //  wait for replies skeletons to disappear
    this.debug("Waiting for replies to load...");
    await this.scrapingSupport.sleep(500);
    await this.scrapingSupport.waitUntilNoVisibleElementMatches(
      document,
      "#ghost-comment-section",
      {
        scrollRemainingElementsIntoView: true,
      },
    );

    // expand more replies button
    for (;;) {
      await this.scrapingSupport.resumeHostPage();

      const moreRepliesButtons = this.scrapingSupport
        .selectAll(
          document,
          'button[aria-label="Afficher plus de réponses"],' +
            'button[aria-label="Show more replies"]',
          HTMLElement,
        )
        .filter((e) => this.scrapingSupport.isVisible(e));

      if (moreRepliesButtons.length === 0) {
        return;
      } else {
        this.debug(
          "clicking ",
          moreRepliesButtons.length,
          " more replies buttons",
        );
        for (const b of moreRepliesButtons) {
          b.scrollIntoView();
          b.click();
        }
        //  wait for replies skeletons to disappear
        this.debug("Waiting for replies to load...");
        await this.scrapingSupport.sleep(500);
        await this.scrapingSupport.waitUntilNoVisibleElementMatches(
          document,
          "#ghost-comment-section",
          {
            scrollRemainingElementsIntoView: true,
          },
        );
      }
    }
  }

  private async expandLongComments() {
    const readMoreButton = this.scrapingSupport
      .selectAll(document, "#more", HTMLElement)
      .filter((e) => this.scrapingSupport.isVisible(e));
    this.debug("Expanding ", readMoreButton.length, " read more button...");
    for (const b of readMoreButton) {
      b.scrollIntoView();
      b.click();
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private async scrapCommentWithoutReplies(
    commentContainer: HTMLElement,
    fullPageScreenshot: FullPageScreenshotResult,
  ): Promise<CommentSnapshot> {
    const scrapDate = currentIsoDate();

    const author: Author = await this.scrapCommentAuthor(commentContainer);
    const publishedTimeElement = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "#published-time-text",
      HTMLElement,
    );
    const publishedAtText = publishedTimeElement.innerText;
    const publishedAt = new PublicationDateTextParsing(publishedAtText).parse();
    this.debug(`publishedAtInfo: ${publishedAt}`);

    const commentHref = this.scrapingSupport.selectOrThrow(
      publishedTimeElement,
      "a",
      HTMLAnchorElement,
    ).href;
    const commentId = extractCommentIdFromCommentHref(commentHref);

    const commentTextHandle = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "#content-text",
      HTMLElement,
    );

    const nbLikes = this.scrapNbLikes(commentContainer);

    const commentText = this.scrapCommentText(commentTextHandle);

    const boundingBox = commentContainer.getBoundingClientRect();
    if (
      window.innerWidth !== fullPageScreenshot.viewPortSize.width ||
      window.innerHeight !== fullPageScreenshot.viewPortSize.height
    ) {
      // Windows resized since screenshot
      // This surely have changed page layout
      // We cannot proceed as we need bounding box and screenshot to match
      throw new WindowResizedSinceScreenshotError();
    }

    const screenshotImage = fullPageScreenshot.image.crop({
      origin: {
        column: Math.floor(boundingBox.x + window.scrollX),
        row: Math.floor(boundingBox.y + window.scrollY),
      },
      width: Math.ceil(boundingBox.width),
      height: Math.ceil(boundingBox.height),
    });
    const screenshotData = uint8ArrayToBase64(encodePng(screenshotImage));

    return {
      id: crypto.randomUUID(),
      commentId,
      textContent: commentText,
      author: author,
      publishedAt: publishedAt,
      scrapedAt: scrapDate,
      nbLikes: nbLikes,
      screenshotData,
      // replies are captured in other method
      replies: [],
    };
  }

  private async scrapCommentAuthor(
    commentContainer: HTMLElement,
  ): Promise<Author> {
    const authorTextHandle = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "a#author-text",
      HTMLAnchorElement,
    );
    const commentAuthor = authorTextHandle.innerText.trim();
    const commentAuthorHref = authorTextHandle?.href;

    const author: Author = {
      name: commentAuthor,
      accountHref: commentAuthorHref,
    };
    return author;
  }

  private scrapCommentText(commentTextHandle: HTMLElement): string {
    const iterator = document.createNodeIterator(commentTextHandle);
    const textElements: string[] = [];
    let node: Node | null;

    while ((node = iterator.nextNode())) {
      if (node instanceof Text && node.nodeValue) {
        textElements.push(node.nodeValue);
      } else if (node instanceof HTMLImageElement && node.alt) {
        textElements.push(node.alt);
      }
    }

    return textElements.join(" ").trim();
  }

  private scrapNbLikes(commentContainer: HTMLElement): number {
    const nbLikesStr = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "#vote-count-middle",
      HTMLElement,
    ).innerText;

    const nbLikesParsed = Number.parseInt(nbLikesStr);

    return Number.isNaN(nbLikesParsed) ? 0 : nbLikesParsed;
  }

  private coverImageUrl(postId: string): string {
    return `https://i.ytimg.com/vi/${postId}/hq720.jpg`;
  }
}

class WindowResizedSinceScreenshotError extends Error {}
