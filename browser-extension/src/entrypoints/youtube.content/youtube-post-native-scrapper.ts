import { PostSnapshot, CommentSnapshot } from "@/shared/model/PostSnapshot";
import { PublicationDate } from "@/shared/model/PublicationDate";
import { currentIsoDate } from "../../shared/utils/current-iso-date";
import { encodePng, Image } from "image-js";

import { ScrapingSupport } from "../../shared/scraping/ScrapingSupport";
import { uint8ArrayToBase64 } from "../../shared/utils/base-64";
import { Rect } from "../../shared/native-screenshoting/cs/rect";
import { captureFullPageScreenshot } from "../../shared/native-screenshoting/cs/page-screenshot";
import { PublicationDateTextParsing } from "@/shared/utils/date-text-parsing";
import { Author } from "@/shared/model/Author";
import { youtubePageInfo } from "./youtubePageInfo";
import { extractCommentIdFromCommentHref } from "./extractCommentIdFromCommentHref";
const LOG_PREFIX = "[CS - YoutubePostNativeScrapper] ";

type CommentPreScreenshot = {
  /**
   * The rect this screenshot occupies relative to document top.
   */
  area: Rect;
  comment: Omit<CommentSnapshot, "screenshotData">;
};

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

  async scrapPost(): Promise<PostSnapshot> {
    this.debug("Start Scrraping... ", document.URL);
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

    this.debug("Scraping comments...");
    const comments: CommentSnapshot[] = await this.scrapPostComments();
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
    infoElement.scrollIntoView();
    const value = this.scrapingSupport.select(
      infoElement,
      "span:nth-child(3)",
      HTMLElement,
    );
    return new PublicationDateTextParsing(value?.innerText ?? "").parse();
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

  private async scrapPostComments(): Promise<CommentSnapshot[]> {
    const commentsSectionHandle = this.scrapingSupport.selectOrThrow(
      document,
      "#comments",
      HTMLElement,
    );
    commentsSectionHandle.scrollIntoView();

    this.debug("Sorting comments by newest...");
    await this.sortCommentsByNewest();

    this.debug("Loading all comment threads...");
    await this.loadAllTopLevelComments();

    // TODO fix Load replies is unstable:
    // * it sometimes stuck indefinitely with 1 remainign more Replies to click
    // * some elements are still not rendered when it finishes

    this.debug("Expanding all replies...");
    await this.loadAllReplies();

    this.debug("Expanding long comments...");
    await this.expandLongComments();

    this.debug("Capturing loaded comments...");
    // Wait for at least one to be present
    this.scrapingSupport.waitForSelector(
      commentsSectionHandle,
      "#comment-container",
      HTMLElement,
    );

    this.debug("Capturing full page screenshot");
    const fullPageScreenshot = await this.capturePageScreenshot();

    this.debug("Capturing comment threads...");
    const threadContainers = this.scrapingSupport.selectAll(
      commentsSectionHandle,
      "#contents > ytd-comment-thread-renderer",
      HTMLElement,
    );
    const comments = this.scrapCommentThreads(
      threadContainers,
      fullPageScreenshot,
    );
    this.debug("Comments metada:", comments);

    return comments;
  }

  private async scrapCommentThreads(
    threadContainers: HTMLElement[],
    fullPageScreenshot: Image,
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
    fullPageScreenshot: Image,
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

    const commentPreScreenshot = await this.scrapComment(commentContainer);

    const repliesContainer = this.scrapingSupport.select(
      commentThreadContainer,
      "#replies",
      HTMLElement,
    );

    if (repliesContainer) {
      commentPreScreenshot.comment.replies = await this.scrapCommentReplies(
        repliesContainer,
        fullPageScreenshot,
      );
    }

    const screenshotImage = fullPageScreenshot.crop({
      origin: {
        row: commentPreScreenshot.area.y,
        column: commentPreScreenshot.area.x,
      },
      height: commentPreScreenshot.area.height,
      width: commentPreScreenshot.area.width,
    });
    const base64PngData = uint8ArrayToBase64(encodePng(screenshotImage));

    return {
      comment: {
        ...commentPreScreenshot.comment,
        screenshotData: base64PngData,
      },
      scrapingStatus: "success",
    };
  }

  private async scrapCommentReplies(
    repliesContainer: HTMLElement,
    fullPageScreenshot: Image,
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

  private async capturePageScreenshot(): Promise<Image> {
    // Hide matshead overlay that prevent screenshoting elements
    const masthead = this.scrapingSupport.selectOrThrow(
      document,
      "#masthead-container",
      HTMLElement,
    );
    masthead.style.visibility = "hidden";
    await this.scrapingSupport.resumeHostPage();

    try {
      return await captureFullPageScreenshot(this.scrapingSupport);
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
      await this.scrapingSupport.resumeHostPage();
    }

    // expand more replies button
    for (;;) {
      await this.scrapingSupport.resumeHostPage();

      const moreRepliesButtons = this.scrapingSupport
        .selectAll(
          document,
          'button[aria-label="Afficher plus de réponses"]',
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
          await this.scrapingSupport.resumeHostPage();
        }
        //
        await this.scrapingSupport.sleep(500);
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

  private async scrapComment(
    commentContainer: HTMLElement,
  ): Promise<CommentPreScreenshot> {
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
    const commentPre: CommentPreScreenshot = {
      comment: {
        id: crypto.randomUUID(),
        commentId,
        textContent: commentText,
        author: author,
        publishedAt: publishedAt,
        scrapedAt: scrapDate,
        // TODO capture replies
        replies: [],
        nbLikes: nbLikes,
      },

      area: {
        x: Math.floor(boundingBox.x + window.scrollX),
        y: Math.floor(boundingBox.y + window.scrollY),
        width: Math.ceil(boundingBox.width),
        height: Math.ceil(boundingBox.height),
      },
    };
    return commentPre;
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
