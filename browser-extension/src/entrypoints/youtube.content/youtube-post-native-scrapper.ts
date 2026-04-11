import {
  PostSnapshot,
  CommentSnapshot,
  countAllComments,
} from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "../../shared/utils/current-iso-date";
import { decodePng, encodePng, Image as ImageJs } from "image-js";

import { ScrapingSupport } from "../../shared/scraping/ScrapingSupport";
import {
  base64ToUint8Array,
  uint8ArrayToBase64,
} from "../../shared/utils/base-64";
import {
  captureFullPageScreenshot,
  FullPageScreenshotResult,
} from "../../shared/native-screenshoting/cs/page-screenshot";
import { Author } from "@/shared/model/Author";
import { youtubePageInfo } from "./youtubePageInfo";
import { extractCommentIdFromCommentHref } from "./extractCommentIdFromCommentHref";
import { extractIsoDateFromPostInfoTooltipText } from "./extractIsoDateFromPostInfoTooltipText";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";

import { withRetry } from "../../shared/utils/withRetry";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { parseCommentPublishedTime } from "./parseCommentPublishedTime";
import { captureTabScreenshotAsDataUrl } from "@/shared/native-screenshoting/cs/screenshot-cs-tab";
import { extractBase64DataFromDataUrl } from "@/shared/utils/data-url";
const LOG_PREFIX = "[CS - YoutubePostNativeScrapper] ";
const YOUTUBE_SHORTS_PATH_SEGMENT = "/shorts/";
const YOUTUBE_SHORTS_COMMENTS_PANEL_SELECTOR =
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]';
const YOUTUBE_SHORTS_COMMENT_BUTTON_SELECTOR =
  'div[role="button"][aria-label*="comment" i], button[aria-label*="comment" i]';

/**
 * In a thread, sometimes a comment can not be parsed.
 * In that case there is nothing to scrap => failure.
 */
type CommentThread =
  | { scrapingStatus: "success"; comment: CommentSnapshot }
  | { scrapingStatus: "failure"; message: string };

export class YoutubePostNativeScrapper {
  public constructor(private scrapingSupport: ScrapingSupport) {}

  private debug(...data: unknown[]) {
    console.debug(LOG_PREFIX, ...data);
  }
  private info(...data: unknown[]) {
    console.info(LOG_PREFIX, ...data);
  }
  private warn(...data: unknown[]) {
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
    const isShortsPost = this.isShortsPostUrl(url);

    // Pause video to ensure it doesn't autoplay next video during scraping..."
    this.debug("Pause video...");
    (
      await this.scrapingSupport.waitForSelectorOrThrow(
        document,
        "video",
        HTMLVideoElement,
      )
    ).pause();

    this.debug("Scraping title...");
    const title = this.scrapPostTitle(isShortsPost);
    this.debug(`title: ${title}`);

    this.debug("Scraping author...");
    const author = await this.scrapPostAuthor(isShortsPost);
    this.debug(`author.name: ${author.name}`);

    this.debug("Scraping textContent...");
    const textConent = this.scrapPostTextContent(isShortsPost);
    this.debug(`textContent: ${textConent.replaceAll("\n", "")}`);

    this.debug("Scraping publishedAt...");
    const publishedAt = await this.scrapPostPublishedAt(isShortsPost);
    this.debug(`publishedAt: ${JSON.stringify(publishedAt)}`);

    // Init accounts for 1%
    progressManager.setProgress(1);

    this.debug("Scraping comments...");
    const comments: CommentSnapshot[] = await this.scrapPostComments(
      isShortsPost,
      // Scraping comments accounts for 99% of progress
      progressManager.subTaskProgressManager({ from: 1, to: 100 }),
    );
    return {
      id: crypto.randomUUID(),
      postId: pageInfo.postId,
      socialNetwork: SocialNetwork.YouTube,
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

  private scrapPostTitle(isShortsPost: boolean): string {
    if (!isShortsPost) {
      const titleElement = this.scrapingSupport.select(
        document,
        ".watch-active-metadata #title",
        HTMLElement,
      );
      if (titleElement && this.scrapingSupport.isVisible(titleElement)) {
        return titleElement.innerText;
      }
    }

    const shortTitle = this.getMetaContent('meta[property="og:title"]');
    if (shortTitle) {
      return shortTitle;
    }

    throw new Error("Failed to scrap post title");
  }

  private scrapPostTextContent(isShortsPost: boolean): string {
    if (!isShortsPost) {
      const descriptionElement = this.scrapingSupport.select(
        document,
        "#description #snippet-text",
        HTMLElement,
      );
      if (
        descriptionElement &&
        this.scrapingSupport.isVisible(descriptionElement)
      ) {
        return descriptionElement.innerText;
      }
    }

    return this.getMetaContent('meta[property="og:description"]') || "";
  }

  private async scrapPostPublishedAt(
    isShortsPost: boolean,
  ): Promise<PublicationDate> {
    if (!isShortsPost) {
      const infoElement = this.scrapingSupport.select(
        document,
        "#description #info",
        HTMLElement,
      );
      if (infoElement && this.scrapingSupport.isVisible(infoElement)) {
        // Open tooltip by triggering mouseenter
        infoElement.dispatchEvent(
          new MouseEvent("mouseenter", {
            bubbles: true,
            cancelable: true,
            view: window,
          }),
        );
        const tooltipText = (
          await this.scrapingSupport.waitForSelectorOrThrow(
            document,
            "#description #tooltip",
            HTMLElement,
          )
        ).innerText;
        return {
          type: "absolute",
          date: extractIsoDateFromPostInfoTooltipText(tooltipText),
        };
      }
    }

    const rawPublishedDate = this.getMetaContent(
      'meta[itemprop="datePublished"]',
    );
    if (!rawPublishedDate) {
      throw new Error("Failed to scrap post published date");
    }

    const parsedDate = new Date(rawPublishedDate);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error("Failed to parse post published date");
    }

    return {
      type: "absolute",
      date: parsedDate.toISOString(),
    };
  }

  private async scrapPostAuthor(isShortsPost: boolean): Promise<Author> {
    const ownerElement = isShortsPost
      ? this.scrapingSupport.select(document, "#owner", HTMLElement)
      : await this.scrapingSupport.waitForSelectorOrThrow(
          document,
          "#owner",
          HTMLElement,
        );
    if (!ownerElement) {
      if (isShortsPost) {
        return this.scrapShortsPostAuthorFallback();
      }
      throw new Error("Failed to scrap post author");
    }
    const channelNameEl = this.scrapingSupport.select(
      ownerElement,
      "#channel-name",
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
      ownerElement,
      "#attributed-channel-name",
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

    if (isShortsPost) {
      return this.scrapShortsPostAuthorFallback();
    }
    throw new Error("Failed to scrap post author");
  }

  private async scrapPostComments(
    isShortsPost: boolean,
    progressManager: ProgressManager,
  ): Promise<CommentSnapshot[]> {
    const commentsSectionHandle =
      await this.selectCommentsContainer(isShortsPost);
    if (!isShortsPost) {
      commentsSectionHandle.scrollIntoView();
    }

    this.debug("Sorting comments by newest...");
    await this.sortCommentsByNewest(commentsSectionHandle, isShortsPost);

    const expectedCommentCount = this.extractExpectedCommentCount(
      commentsSectionHandle,
      isShortsPost,
    );
    this.debug("Expecting ", expectedCommentCount, " comments");

    await this.loadAllComments(
      commentsSectionHandle,
      isShortsPost,
      progressManager.subTaskProgressManager({ from: 0, to: 50 }),
    );

    const comments = await this.scrapLoadedComments(
      commentsSectionHandle,
      progressManager.subTaskProgressManager({ from: 50, to: 100 }),
    );

    const scrapedCommentCount = countAllComments(comments);
    if (expectedCommentCount !== scrapedCommentCount) {
      this.warn(
        "Total comments count mismatch: expected",
        expectedCommentCount,
        " scraped:",
        scrapedCommentCount,
      );
    }

    return comments;
  }

  private async selectCommentsContainer(
    isShortsPost: boolean,
  ): Promise<HTMLElement> {
    if (!isShortsPost) {
      return this.scrapingSupport.selectOrThrow(
        document,
        "#comments",
        HTMLElement,
      );
    }

    const shortCommentsPanel = await this.openShortsCommentsPanelIfNeeded();
    if (shortCommentsPanel) {
      return shortCommentsPanel;
    }

    return this.scrapingSupport.waitForSelectorOrThrow(
      document,
      "#comments",
      HTMLElement,
      {
        predicate: (commentsContainer) =>
          this.scrapingSupport.isVisible(commentsContainer),
      },
    );
  }

  private extractExpectedCommentCount(
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
  ) {
    const countInCommentsSection = this.scrapingSupport.select(
      commentsContainer,
      "#count span:nth-of-type(1)",
      HTMLElement,
    );
    if (countInCommentsSection) {
      const extracted = this.extractIntegerFromText(
        countInCommentsSection.innerText,
      );
      if (extracted !== undefined) {
        return extracted;
      }
    }

    if (isShortsPost) {
      const shortCommentsButton = this.selectShortsCommentsButton();
      if (shortCommentsButton) {
        const ariaLabel = shortCommentsButton.getAttribute("aria-label") || "";
        const extracted = this.extractIntegerFromText(ariaLabel);
        if (extracted !== undefined) {
          return extracted;
        }
      }
    }

    return this.scrapingSupport.selectAll(
      commentsContainer,
      "#contents > ytd-comment-thread-renderer",
      HTMLElement,
    ).length;
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
          new Set<string>(),
        );
        progressManager.setProgress(100);
        this.debug("Comments metada:", comments);
        return comments;
      },
    });
  }

  private async loadAllComments(
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
    progressManager: ProgressManager,
  ) {
    this.info("Loading all comments...");

    this.debug("Loading top level comments...");
    await this.loadAllTopLevelComments(commentsContainer, isShortsPost);
    progressManager.setProgress(50);

    this.debug("Expanding all replies...");
    await this.loadAllReplies(commentsContainer, isShortsPost);
    progressManager.setProgress(75);

    this.debug("Expanding long comments...");
    await this.expandLongComments(commentsContainer, isShortsPost);
    progressManager.setProgress(100);
  }

  private async scrapCommentThreads(
    threadContainers: HTMLElement[],
    fullPageScreenshot: FullPageScreenshotResult,
    collectedPostIds: Set<string>,
  ): Promise<CommentSnapshot[]> {
    const comments: CommentSnapshot[] = [];
    for (const threadContainer of threadContainers) {
      const thread = await this.scrapCommentThread(
        threadContainer,
        fullPageScreenshot,
        collectedPostIds,
      );
      if (thread.scrapingStatus === "success") {
        comments.push(thread.comment);
      }
    }
    return comments;
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
    collectedPostIds: Set<string>,
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

    // Youtube sometimes has duplicate
    if (!comment.commentId) {
      throw new Error("Unexpected undefined commentId");
    }
    if (collectedPostIds.has(comment.commentId)) {
      this.warn(
        "Ignoring duplicate comment from ",
        comment.author.name,
        " with id ",
        comment.commentId,
      );
      return {
        scrapingStatus: "failure",
        message: "Duplicate comment " + comment.id,
      };
    }
    collectedPostIds.add(comment.commentId);

    const repliesContainer = this.scrapingSupport.select(
      commentThreadContainer,
      "#replies",
      HTMLElement,
    );

    if (repliesContainer) {
      comment.replies = await this.scrapCommentReplies(
        repliesContainer,
        fullPageScreenshot,
        collectedPostIds,
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
    collectedPostIds: Set<string>,
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

    return this.scrapCommentThreads(
      repliesThreads,
      fullPageScreenshot,
      collectedPostIds,
    );
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

  private async sortCommentsByNewest(
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
  ) {
    if (isShortsPost) {
      // Shorts comments ordering UI can vary and remains optional for scraping completeness.
      return;
    }
    const sortMenu = this.scrapingSupport.select(
      commentsContainer,
      "#sort-menu",
      HTMLElement,
    );
    if (!sortMenu || !this.scrapingSupport.isVisible(sortMenu)) {
      this.warn("Sort menu not found");
      return;
    }
    sortMenu.scrollIntoView();
    await this.scrapingSupport.resumeHostPage();

    // Wait for loading using previous sort method to finish
    // Track spinner disappearing
    await this.scrapingSupport.waitUntilNoVisibleElementMatches(
      commentsContainer,
      "#spinnerContainer.active",
    );

    // Do change the sort to by newest
    this.scrapingSupport
      .selectOrThrow(sortMenu, "#trigger", HTMLElement)
      .click();
    (
      await this.scrapingSupport.waitForSelectorOrThrow(
        sortMenu,
        "a:nth-child(2)",
        HTMLElement,
      )
    ).click();
    await this.scrapingSupport.resumeHostPage();
    // Wait for initial comments loading using new sort method
    await this.scrapingSupport.waitUntilNoVisibleElementMatches(
      commentsContainer,
      "#spinnerContainer.active",
    );
  }

  /**
   * Loads all top level comments of the post.
   * To achieve this the method
   * * scrolls into view the continuation element  to trigger infinite loading
   * * Waits for the spinner to disappear indicating loading done
   * * Repeats until no more comments are loaded for several seconds
   * @returns
   */
  private async loadAllTopLevelComments(
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
  ): Promise<void> {
    let previousVisibleCommentsCount = 0;
    let lastChange = Date.now();
    for (;;) {
      if (isShortsPost) {
        await this.scrollShortsCommentsContainerToBottom(commentsContainer);
      } else {
        const continuationElement = this.scrapingSupport.select(
          commentsContainer,
          "#continuations",
          HTMLElement,
        );
        if (!continuationElement) {
          return;
        }
        continuationElement.scrollIntoView();
        await this.scrapingSupport.resumeHostPage();
      }
      await this.scrapingSupport.waitUntilNoVisibleElementMatches(
        commentsContainer,
        "#spinnerContainer.active",
      );
      const visibleCommentsCount = this.scrapingSupport
        .selectAll(commentsContainer, "#comment-container", HTMLElement)
        .filter((e) => this.scrapingSupport.isVisible(e)).length;
      this.debug(
        "loadAllTopLevelComments - ",
        visibleCommentsCount,
        " comments loaded",
      );
      const assumeDoneDelay = 5000;
      if (visibleCommentsCount !== previousVisibleCommentsCount) {
        previousVisibleCommentsCount = visibleCommentsCount;
        lastChange = Date.now();
      } else if (Date.now() - lastChange > assumeDoneDelay) {
        // No new comments loaded in last few seconds
        // Assume we are done
        return;
      }
    }
  }

  private async loadAllReplies(
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
  ) {
    const repliesButton = this.scrapingSupport
      .selectAll(
        commentsContainer,
        "#replies #more-replies button" +
          "," +
          "#replies #more-replies-sub-thread button",
        HTMLElement,
      )
      .filter((e) => this.scrapingSupport.isVisible(e));
    this.debug("Expanding ", repliesButton.length, " replies button...");
    await this.expandReplies(repliesButton, commentsContainer, isShortsPost);

    // expand more replies button
    const clickedMoreRepliesButtons = new Set<HTMLElement>();
    for (;;) {
      await this.scrapingSupport.resumeHostPage();

      const selectedMoreRepliesButtons = this.scrapingSupport
        .selectAll(
          commentsContainer,
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
        this.warn(
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
        this.debug("Found 0 more replies button - We're done loading replies.");
        return;
      } else {
        this.debug(
          "Found ",
          selectedAndNotYetClicked.length,
          " more replies buttons - Expanding them",
        );
        await this.expandReplies(
          selectedAndNotYetClicked,
          commentsContainer,
          isShortsPost,
        );
        selectedAndNotYetClicked.forEach((b) =>
          clickedMoreRepliesButtons.add(b),
        );
      }
    }
  }

  private async expandReplies(
    repliesButton: HTMLElement[],
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
  ) {
    this.debug("Loading ", repliesButton.length, " replies...");
    for (const button of repliesButton) {
      if (!isShortsPost) {
        button.scrollIntoView();
      }
      button.click();
    }
    // Give 5s per comment section to load
    const timeout = repliesButton.length * 5000;
    await this.waitForCommentGhostSectionsToDisappear(
      commentsContainer,
      isShortsPost,
      timeout,
    );
    this.debug("All ", repliesButton.length, "replies loaded");
  }

  private async expandLongComments(
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
  ) {
    const readMoreButton = this.scrapingSupport
      .selectAll(commentsContainer, "#more", HTMLElement)
      .filter((e) => this.scrapingSupport.isVisible(e));
    this.debug("Expanding ", readMoreButton.length, " read more buttons...");
    for (const b of readMoreButton) {
      if (!isShortsPost) {
        b.scrollIntoView();
      }
      b.click();
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private async scrapCommentWithoutReplies(
    commentContainer: HTMLElement,
    fullPageScreenshot: FullPageScreenshotResult,
  ): Promise<CommentSnapshot> {
    const scrapDate = currentIsoDate();

    const author: Author = this.scrapCommentAuthor(commentContainer);
    const publishedTimeElement = this.scrapingSupport.selectOrThrow(
      commentContainer,
      "#published-time-text",
      HTMLElement,
    );
    const publishedTimeText = publishedTimeElement.innerText;
    const publishedAt = parseCommentPublishedTime(publishedTimeText);
    this.debug(`publishedAtInfo: ${JSON.stringify(publishedAt)}`);

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

    const screenshotData = await this.captureCommentScreenshotData(
      commentContainer,
      fullPageScreenshot,
      boundingBox,
    );

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

  private async captureCommentScreenshotData(
    commentContainer: HTMLElement,
    fullPageScreenshot: FullPageScreenshotResult,
    boundingBox: DOMRect,
  ): Promise<string> {
    if (this.isShortsPostUrl(document.URL)) {
      return this.captureVisibleCommentScreenshotData(commentContainer, {
        preferInternalScroll: true,
      });
    }

    const screenshotFromFullPage =
      this.captureCommentScreenshotDataFromFullPage(
        fullPageScreenshot,
        boundingBox,
      );
    if (screenshotFromFullPage) {
      return screenshotFromFullPage;
    }
    return this.captureVisibleCommentScreenshotData(commentContainer);
  }

  private captureCommentScreenshotDataFromFullPage(
    fullPageScreenshot: FullPageScreenshotResult,
    boundingBox: DOMRect,
  ): string {
    const originX = Math.floor(boundingBox.x + window.scrollX);
    const originY = Math.floor(boundingBox.y + window.scrollY);
    const rawWidth = Math.ceil(boundingBox.width);
    const rawHeight = Math.ceil(boundingBox.height);
    if (rawWidth <= 0 || rawHeight <= 0) {
      return "";
    }

    const imageWidth = fullPageScreenshot.image.width;
    const imageHeight = fullPageScreenshot.image.height;
    const left = Math.max(0, originX);
    const top = Math.max(0, originY);
    const right = Math.min(imageWidth, originX + rawWidth);
    const bottom = Math.min(imageHeight, originY + rawHeight);
    if (right <= left || bottom <= top) {
      this.warn("Skipping out-of-bounds comment screenshot", {
        originX,
        originY,
        rawWidth,
        rawHeight,
        imageWidth,
        imageHeight,
      });
      return "";
    }

    try {
      const screenshotImage = fullPageScreenshot.image.crop({
        origin: {
          column: left,
          row: top,
        },
        width: right - left,
        height: bottom - top,
      });
      return uint8ArrayToBase64(encodePng(screenshotImage));
    } catch (e) {
      this.warn("Failed to crop comment screenshot", {
        error: String(e),
        originX,
        originY,
        rawWidth,
        rawHeight,
        imageWidth,
        imageHeight,
      });
      return "";
    }
  }

  private async captureVisibleCommentScreenshotData(
    commentContainer: HTMLElement,
    options?: {
      preferInternalScroll?: boolean;
    },
  ): Promise<string> {
    try {
      const scrollableAncestor = options?.preferInternalScroll
        ? this.findNearestScrollableAncestor(commentContainer)
        : undefined;

      if (scrollableAncestor) {
        const fullCommentHeight =
          this.computeCommentEstimatedHeight(commentContainer);
        if (fullCommentHeight > scrollableAncestor.clientHeight - 8) {
          return await this.captureLongCommentVisibleScreenshotData(
            commentContainer,
            scrollableAncestor,
            fullCommentHeight,
          );
        }
      }

      await this.positionCommentForScreenshot(commentContainer, options);
      const segment = await this.captureVisibleCommentScreenshotSegment(
        commentContainer,
        scrollableAncestor,
      );
      if (!segment) {
        return "";
      }
      return uint8ArrayToBase64(encodePng(segment.image));
    } catch (e) {
      this.warn("Failed to capture visible comment screenshot", String(e));
      return "";
    }
  }

  private async positionCommentForScreenshot(
    commentContainer: HTMLElement,
    options?: {
      preferInternalScroll?: boolean;
    },
  ) {
    if (options?.preferInternalScroll) {
      const scrollableAncestor =
        this.findNearestScrollableAncestor(commentContainer);
      if (scrollableAncestor) {
        this.scrollElementIntoContainerCenter(
          commentContainer,
          scrollableAncestor,
        );
        await this.scrapingSupport.resumeHostPage();
        return;
      }
    }

    commentContainer.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
    await this.scrapingSupport.resumeHostPage();
  }

  private findNearestScrollableAncestor(
    element: HTMLElement,
  ): HTMLElement | undefined {
    let current: HTMLElement | null = element.parentElement;
    while (current && current !== document.body) {
      if (current.scrollHeight - current.clientHeight > 32) {
        return current;
      }
      current = current.parentElement;
    }
    return undefined;
  }

  private scrollElementIntoContainerCenter(
    element: HTMLElement,
    container: HTMLElement,
  ) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const deltaY =
      elementRect.top -
      containerRect.top -
      (container.clientHeight -
        Math.min(elementRect.height, container.clientHeight)) /
        2;
    container.scrollTop += deltaY;
  }

  private async captureLongCommentVisibleScreenshotData(
    commentContainer: HTMLElement,
    scrollableAncestor: HTMLElement,
    fullCommentHeight: number,
  ): Promise<string> {
    const initialScrollTop = scrollableAncestor.scrollTop;
    try {
      const segments: Array<{ offsetTop: number; image: ImageJs }> = [];
      const maxScrollTop = Math.max(
        0,
        scrollableAncestor.scrollHeight - scrollableAncestor.clientHeight,
      );
      const commentTopInContainer = this.computeCommentTopInContainer(
        commentContainer,
        scrollableAncestor,
      );
      scrollableAncestor.scrollTop = Math.max(
        0,
        Math.min(maxScrollTop, Math.floor(commentTopInContainer)),
      );
      await this.scrapingSupport.resumeHostPage();
      await this.scrapingSupport.sleep(60);

      for (let attempt = 0; attempt < 32; attempt += 1) {
        await this.scrapingSupport.resumeHostPage();
        const segment = await this.captureVisibleCommentScreenshotSegment(
          commentContainer,
          scrollableAncestor,
        );
        if (!segment) {
          continue;
        }

        const lastSegment = segments[segments.length - 1];
        if (lastSegment && segment.offsetTop <= lastSegment.offsetTop + 3) {
          break;
        }
        segments.push(segment);

        const currentScrollTop = scrollableAncestor.scrollTop;
        const overlapHeight = Math.max(48, Math.floor(segment.image.height * 0.22));
        const nextOffsetTop = Math.max(
          0,
          segment.offsetTop + segment.image.height - overlapHeight,
        );
        const nextScrollTop = Math.max(
          0,
          Math.min(maxScrollTop, Math.floor(commentTopInContainer + nextOffsetTop)),
        );
        if (nextScrollTop <= currentScrollTop + 1) {
          break;
        }
        scrollableAncestor.scrollTop = nextScrollTop;
        await this.scrapingSupport.sleep(60);
      }

      if (segments.length === 0) {
        return "";
      }

      const stitched = this.stitchCommentScreenshotSegments(
        segments,
        fullCommentHeight,
      );
      return uint8ArrayToBase64(encodePng(stitched));
    } finally {
      scrollableAncestor.scrollTop = initialScrollTop;
      await this.scrapingSupport.resumeHostPage();
    }
  }

  private computeCommentTopInContainer(
    commentContainer: HTMLElement,
    scrollableAncestor: HTMLElement,
  ): number {
    const containerRect = scrollableAncestor.getBoundingClientRect();
    const commentRect = commentContainer.getBoundingClientRect();
    return commentRect.top - containerRect.top + scrollableAncestor.scrollTop;
  }

  private async captureVisibleCommentScreenshotSegment(
    commentContainer: HTMLElement,
    scrollableAncestor?: HTMLElement,
  ): Promise<{ offsetTop: number; image: ImageJs } | undefined> {
    await this.scrapingSupport.sleep(120);
    const screenshotDataUrl = await captureTabScreenshotAsDataUrl();
    const image = decodePng(
      base64ToUint8Array(extractBase64DataFromDataUrl(screenshotDataUrl)),
    );
    const crop = this.cropVisibleCommentSegmentFromImage(
      commentContainer,
      image,
      scrollableAncestor,
    );
    return crop;
  }

  private cropVisibleCommentSegmentFromImage(
    commentContainer: HTMLElement,
    screenshotImage: ImageJs,
    scrollableAncestor?: HTMLElement,
  ): { offsetTop: number; image: ImageJs } | undefined {
    const rect = commentContainer.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) {
      return undefined;
    }

    let leftCss = Math.max(0, rect.x);
    let topCss = Math.max(0, rect.y);
    let rightCss = Math.min(window.innerWidth, rect.x + rect.width);
    let bottomCss = Math.min(window.innerHeight, rect.y + rect.height);

    let offsetTop = 0;
    if (scrollableAncestor) {
      const containerRect = scrollableAncestor.getBoundingClientRect();
      leftCss = Math.max(leftCss, containerRect.left);
      rightCss = Math.min(rightCss, containerRect.right);
      topCss = Math.max(topCss, containerRect.top);
      bottomCss = Math.min(bottomCss, containerRect.bottom);

      const commentTopInContainer = this.computeCommentTopInContainer(
        commentContainer,
        scrollableAncestor,
      );
      const visibleTopInContainer = Math.max(
        scrollableAncestor.scrollTop,
        commentTopInContainer,
      );
      offsetTop = Math.max(
        0,
        Math.floor(visibleTopInContainer - commentTopInContainer),
      );
    }

    if (rightCss <= leftCss || bottomCss <= topCss) {
      return undefined;
    }

    const scaleX = screenshotImage.width / window.innerWidth;
    const scaleY = screenshotImage.height / window.innerHeight;

    const x = Math.max(0, Math.floor(leftCss * scaleX));
    const y = Math.max(0, Math.floor(topCss * scaleY));
    const width = Math.min(
      screenshotImage.width - x,
      Math.ceil((rightCss - leftCss) * scaleX),
    );
    const height = Math.min(
      screenshotImage.height - y,
      Math.ceil((bottomCss - topCss) * scaleY),
    );
    if (width <= 0 || height <= 0) {
      return undefined;
    }

    const cropped = screenshotImage.crop({
      origin: { column: x, row: y },
      width,
      height,
    });
    return {
      offsetTop,
      image: cropped,
    };
  }

  private stitchCommentScreenshotSegments(
    segments: Array<{ offsetTop: number; image: ImageJs }>,
    fullCommentHeight: number,
  ): ImageJs {
    const sortedSegments = [...segments].sort(
      (a, b) => a.offsetTop - b.offsetTop,
    );
    const width = sortedSegments.reduce(
      (maxWidth, segment) => Math.max(maxWidth, segment.image.width),
      1,
    );
    const fullHeight = Math.max(
      Math.ceil(fullCommentHeight),
      ...sortedSegments.map(
        (segment) => segment.offsetTop + segment.image.height,
      ),
    );

    let stitched = new ImageJs(width, fullHeight);
    let lastWrittenBottom = 0;
    for (const segment of sortedSegments) {
      const row = Math.max(
        0,
        Math.min(fullHeight - segment.image.height, segment.offsetTop),
      );
      stitched = segment.image.copyTo(stitched, {
        origin: {
          row,
          column: 0,
        },
      });
      lastWrittenBottom = Math.max(
        lastWrittenBottom,
        row + segment.image.height,
      );
    }

    if (lastWrittenBottom <= 0 || lastWrittenBottom >= fullHeight) {
      return stitched;
    }
    return stitched.crop({
      origin: {
        row: 0,
        column: 0,
      },
      width,
      height: lastWrittenBottom,
    });
  }

  private computeCommentEstimatedHeight(commentContainer: HTMLElement): number {
    const rect = commentContainer.getBoundingClientRect();
    return Math.max(commentContainer.scrollHeight, Math.ceil(rect.height));
  }

  scrapCommentAuthor(commentContainer: HTMLElement): Author {
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

  private async waitForCommentGhostSectionsToDisappear(
    commentsContainer: HTMLElement,
    isShortsPost: boolean,
    timeout?: number,
  ) {
    await this.scrapingSupport.sleep(300);
    try {
      await this.scrapingSupport.waitUntilNoVisibleElementMatches(
        commentsContainer,
        "#ghost-comment-section",
        {
          timeout: timeout,
          onRemainingElements: async (elements) => {
            this.debug(elements.length, " remaining ghost sections");
            if (isShortsPost) {
              await this.scrollShortsCommentsContainerToBottom(
                commentsContainer,
              );
            } else {
              for (const el of elements) {
                el.scrollIntoView();
                await this.scrapingSupport.resumeHostPage();
              }
            }
          },
        },
      );
    } catch (e) {
      if (isShortsPost) {
        // On Shorts, ghost placeholders can remain mounted even when comments are loaded.
        // Do not fail the whole scraping flow in that case.
        this.warn(
          "Continuing despite remaining ghost comment sections on Shorts",
          String(e),
        );
        return;
      }
      throw e;
    }
  }

  private isShortsPostUrl(url: string): boolean {
    return url.includes(YOUTUBE_SHORTS_PATH_SEGMENT);
  }

  private getMetaContent(selector: string): string | undefined {
    const element = this.scrapingSupport.select(
      document,
      selector,
      HTMLElement,
    );
    const value = element?.getAttribute("content")?.trim();
    return value ? value : undefined;
  }

  private scrapShortsPostAuthorFallback(): Author {
    const shortsAuthorLink = this.scrapingSupport.select(
      document,
      'a[href*="/@"][href*="/shorts"]',
      HTMLAnchorElement,
    );

    if (shortsAuthorLink) {
      const maybeAuthorName = shortsAuthorLink.innerText.trim();
      const authorName =
        maybeAuthorName || this.getMetaContent('link[itemprop="name"]');
      if (authorName) {
        return {
          name: authorName,
          accountHref: shortsAuthorLink.href,
        };
      }
    }

    const authorName = this.getMetaContent('link[itemprop="name"]');
    if (authorName) {
      return {
        name: authorName,
        accountHref: document.URL,
      };
    }

    throw new Error("Failed to scrap post author");
  }

  private selectShortsCommentsButton(): HTMLElement | undefined {
    const activeReelButton = this.scrapingSupport
      .selectAll(
        document,
        `ytd-reel-video-renderer[is-active] ${YOUTUBE_SHORTS_COMMENT_BUTTON_SELECTOR}`,
        HTMLElement,
      )
      .find((element) => this.scrapingSupport.isVisible(element));
    if (activeReelButton) {
      return activeReelButton;
    }

    return this.scrapingSupport
      .selectAll(document, YOUTUBE_SHORTS_COMMENT_BUTTON_SELECTOR, HTMLElement)
      .find((element) => this.scrapingSupport.isVisible(element));
  }

  private async openShortsCommentsPanelIfNeeded(): Promise<
    HTMLElement | undefined
  > {
    const existingVisiblePanel = this.scrapingSupport
      .selectAll(document, YOUTUBE_SHORTS_COMMENTS_PANEL_SELECTOR, HTMLElement)
      .find((panel) => this.scrapingSupport.isVisible(panel));
    if (existingVisiblePanel) {
      return existingVisiblePanel;
    }

    const commentsButton = this.selectShortsCommentsButton();
    if (!commentsButton) {
      this.warn("Failed to find shorts comments button");
      return undefined;
    }

    await this.scrapingSupport.resumeHostPage();
    commentsButton.click();
    await this.scrapingSupport.resumeHostPage();
    const panelSelectionResult = await this.scrapingSupport.waitForSelector(
      document,
      YOUTUBE_SHORTS_COMMENTS_PANEL_SELECTOR,
      HTMLElement,
      {
        predicate: (panel) => this.scrapingSupport.isVisible(panel),
        timeout: 5000,
      },
    );
    if (panelSelectionResult.status === "success") {
      return panelSelectionResult.element;
    }
    this.warn(
      "Shorts comments panel not visible after clicking comment button",
    );
    return undefined;
  }

  private async scrollShortsCommentsContainerToBottom(
    commentsContainer: HTMLElement,
  ) {
    const scrollableContainer =
      this.findScrollableShortsCommentsContainer(commentsContainer);
    scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
    await this.scrapingSupport.resumeHostPage();
  }

  private findScrollableShortsCommentsContainer(
    commentsContainer: HTMLElement,
  ): HTMLElement {
    const nestedElements = Array.from(
      commentsContainer.querySelectorAll("*"),
    ).filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    const candidates = [commentsContainer, ...nestedElements].filter((element) =>
      this.isScrollableElementCandidate(element),
    );
    if (candidates.length === 0) {
      return commentsContainer;
    }

    const rankedCandidates = candidates.map((element) => ({
      element,
      descendantThreadCount: element.querySelectorAll(
        "ytd-comment-thread-renderer",
      ).length,
      scrollRange: element.scrollHeight - element.clientHeight,
      depth: this.elementDepthFromAncestor(element, commentsContainer),
    }));

    const withThreads = rankedCandidates.filter(
      (candidate) => candidate.descendantThreadCount > 0,
    );
    if (withThreads.length > 0) {
      withThreads.sort(
        (a, b) =>
          b.descendantThreadCount - a.descendantThreadCount ||
          b.scrollRange - a.scrollRange ||
          a.depth - b.depth,
      );
      return withThreads[0].element;
    }

    rankedCandidates.sort(
      (a, b) => b.scrollRange - a.scrollRange || a.depth - b.depth,
    );
    return rankedCandidates[0].element;
  }

  private isScrollableElementCandidate(element: HTMLElement): boolean {
    if (element.clientHeight <= 0) {
      return false;
    }
    const scrollRange = element.scrollHeight - element.clientHeight;
    if (scrollRange <= 32) {
      return false;
    }
    const computedStyle = window.getComputedStyle(element);
    const overflowY = computedStyle.overflowY.toLowerCase();
    return (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "overlay"
    );
  }

  private elementDepthFromAncestor(
    element: HTMLElement,
    ancestor: HTMLElement,
  ): number {
    let depth = 0;
    let current: HTMLElement | null = element;
    while (current && current !== ancestor) {
      depth += 1;
      current = current.parentElement;
    }
    return depth;
  }

  private extractIntegerFromText(text: string): number | undefined {
    const normalized = text
      .replaceAll("\u00A0", "")
      .replaceAll("\u202F", "")
      .replaceAll(",", "")
      .replaceAll(".", "");
    const matched = normalized.match(/\d+/);
    if (!matched) {
      return undefined;
    }
    const parsed = Number.parseInt(matched[0], 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}

class WindowResizedSinceScreenshotError extends Error {}
