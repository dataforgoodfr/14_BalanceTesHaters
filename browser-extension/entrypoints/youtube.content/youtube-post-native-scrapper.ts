import { Author, Post, Comment } from "@/entrypoints/shared/model/post";
import { currentIsoDate } from "../background/scraping/utils/current-iso-date";
import { parseSocialNetworkUrl } from "../shared/social-network-url";
import { encodePng, Image } from "image-js";

import {
  isVisible,
  resumeHostPage,
  select,
  selectAll,
  selectOrThrow,
  waitForSelector,
} from "../shared/dom-scraping/dom-scraping";
import { sleep } from "../shared/utils/sleep";
import { uint8ArrayToBase64 } from "../shared/utils/base-64";
import { Rect } from "../shared/native-screenshoting/cs/rect";
import { captureFullPageScreenshot } from "../shared/native-screenshoting/cs/page-screenshot";
const LOG_PREFIX = "[CS - YoutubePostNativeScrapper] ";

type CommentPreScreenshot = {
  /**
   * The rect this screenshot occupies relative to document top.
   */
  area: Rect;
  comment: Omit<Comment, "screenshotData">;
};

export class YoutubePostNativeScrapper {
  public constructor() {}

  private debug(...data: typeof console.debug.arguments) {
    console.debug(LOG_PREFIX, ...data);
  }

  async scrapPost(): Promise<Post> {
    this.debug("Start Scrraping... ", document.URL);
    const url = document.URL;
    const urlInfo = parseSocialNetworkUrl(url);
    if (!urlInfo) {
      throw new Error();
    }
    const startTime = Date.now();
    const scrapTimestamp = currentIsoDate();

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
    const publishedAt = await this.scrapPostPublishedAt();
    this.debug(`publishedAt: ${publishedAt}`);

    this.debug("Scraping comments...");
    const comments: Comment[] = await this.scrapPostComments();
    this.debug(`${comments.length} comments`);

    const duration = Date.now() - startTime;
    this.debug(`Scraping took ${duration}ms`);

    return {
      postId: urlInfo.postId,
      socialNetwork: "YOUTUBE",
      scrapedAt: scrapTimestamp,
      url: url,
      author: author,
      publishedAt: publishedAt,
      textContent: textConent,
      comments: comments,
      title,
    };
  }

  private scrapPostTitle(): string {
    return selectOrThrow(document, ".watch-active-metadata #title", HTMLElement)
      .innerText;
  }

  private scrapPostTextContent() {
    return selectOrThrow(document, "#description #snippet-text", HTMLElement)
      .innerText;
  }

  private async scrapPostPublishedAt(): Promise<string> {
    const infoElement = selectOrThrow(
      document,
      "#description #info",
      HTMLElement
    );
    infoElement.scrollIntoView();
    const value = select(infoElement, "span:nth-child(3)", HTMLElement);
    if (!value) {
      return "";
    }
    return value.innerText;
  }

  private async scrapPostAuthor(): Promise<Author> {
    const channelNameEl = select(document, "#owner #channel-name", HTMLElement);

    if (channelNameEl && isVisible(channelNameEl)) {
      const channelName = channelNameEl.innerText;

      const link = selectOrThrow(channelNameEl, "a", HTMLAnchorElement);
      const channelUrl = link.href;
      return {
        name: channelName,
        accountHref: channelUrl,
      };
    }
    const attributedChannelNameEl = select(
      document,
      "#owner #attributed-channel-name",
      HTMLElement
    );
    if (attributedChannelNameEl && isVisible(attributedChannelNameEl)) {
      const channelName = attributedChannelNameEl.innerText;

      const link = selectOrThrow(
        attributedChannelNameEl,
        "a",
        HTMLAnchorElement
      );
      const channelUrl = link.href;
      return {
        name: channelName,
        accountHref: channelUrl,
      };
    }
    return {
      name: "unknown",
    };
  }
  private async scrapPostComments(): Promise<Comment[]> {
    const commentsSectionHandle = selectOrThrow(
      document,
      "#comments",
      HTMLElement
    );
    commentsSectionHandle.scrollIntoView();

    this.debug("Sorting comments by newest...");
    await this.sortCommentsByNewest();

    this.debug("Loading all comment threads...");
    await this.loadAllTopLevelComments();

    // TODO fix Load replies is unstalble:
    // * it sometimes stuck indefinitely with 1 remainign  more Replies to click
    // * some elements are still not rendered when it finishes

    this.debug("Expanding all replies...");
    await this.loadAllReplies();

    // TODO implement
    // this.debug("Expanding long comments...");
    // await expandLongComments(commentsSectionHandle)

    this.debug("Capturing loaded comments...");
    // Wait for at least one to be present
    waitForSelector(commentsSectionHandle, "#comment-container", HTMLElement);
    // THen select all comments
    const visibleCommentContainers = selectAll(
      commentsSectionHandle,
      "#comment-container",
      HTMLElement
    ).filter(isVisible);

    // TODO carify why some comments are not visible...

    const commentsPreScreenshot: CommentPreScreenshot[] = await Promise.all(
      visibleCommentContainers.map(async (commentContainer) => {
        return await this.scrapComment(commentContainer);
      })
    );
    this.debug("Comments metada:", commentsPreScreenshot);

    this.debug("capturing full page screenshot");
    const fullPageScreenshot = await this.capturePageScreenshot();
    const comments: Comment[] = [];

    for (const cps of commentsPreScreenshot) {
      const screenshotImage = fullPageScreenshot.crop({
        origin: {
          row: cps.area.y,
          column: cps.area.x,
        },
        height: cps.area.height,
        width: cps.area.width,
      });
      const base64PngData = uint8ArrayToBase64(encodePng(screenshotImage));
      comments.push({
        ...cps.comment,
        screenshotData: base64PngData,
      });
    }
    return comments;
  }

  private async capturePageScreenshot(): Promise<Image> {
    // Hide matshead overlay that prevent screenshoting elements
    const masthead = selectOrThrow(
      document,
      "#masthead-container",
      HTMLElement
    );
    masthead.style.visibility = "hidden";
    await resumeHostPage();

    try {
      return await captureFullPageScreenshot();
    } finally {
      masthead.style.visibility = "visible";
      await resumeHostPage();
    }
  }

  private async sortCommentsByNewest() {
    const sortMenu = await waitForSelector(
      document,
      "#comments #sort-menu",
      HTMLElement
    );
    selectOrThrow(sortMenu, "#trigger", HTMLElement).click();

    (await waitForSelector(sortMenu, "a:nth-child(2)", HTMLElement)).click();
  }

  private async loadAllTopLevelComments(): Promise<void> {
    // In youtube a loader is already present at the end of the list of comment
    // Comment actual loading is triggered when the loader is scrolled into view
    // Spinner is disappearing briefly while new comments are rendered

    let previousCommentsCount = undefined;
    let previousSpinnersCount = undefined;
    let lastChangeTime = Date.now();
    for (;;) {
      const spinners = selectAll(
        document,
        "#comments #spinner",
        HTMLElement
      ).filter(isVisible);
      const comments = selectAll(
        document,
        "#comments ytd-comment-thread-renderer",
        HTMLElement
      ).filter(isVisible);
      this.debug("comments:", comments.length, "spinners:", spinners.length);
      if (spinners.length > 0) {
        const lastSpinner = spinners[spinners.length - 1];
        this.debug(
          "Found spinners scroll to last of them to trigger comment loading"
        );
        lastSpinner.scrollIntoView();
      } else if (Date.now() - lastChangeTime > 5000) {
        this.debug(
          "No more spinners found and no changes since more than 10s... consider all comments loaded."
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
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  private async loadAllReplies() {
    const repliesButton = selectAll(
      document,
      "#replies #more-replies button" +
        "," +
        "#replies #more-replies-sub-thread button",
      HTMLElement
    ).filter(isVisible);
    this.debug("Expanding ", repliesButton.length, " replies button...");
    for (const b of repliesButton) {
      b.scrollIntoView();

      b.click();
      await resumeHostPage();
    }

    // expand more replies button
    for (;;) {
      const moreRepliesButtons = selectAll(
        document,
        'button[aria-label="Afficher plus de réponses"]',
        HTMLElement
      ).filter(isVisible);

      if (moreRepliesButtons.length === 0) {
        return;
      } else {
        this.debug(
          "clicking ",
          moreRepliesButtons.length,
          " more replies buttons"
        );
        for (const b of moreRepliesButtons) {
          b.scrollIntoView();
          b.click();
          await resumeHostPage();
        }
        //
        await sleep(500);
      }
    }
  }

  private async scrapComment(
    commentContainer: HTMLElement
  ): Promise<CommentPreScreenshot> {
    const scrapDate = currentIsoDate();

    const author: Author = await this.scrapCommentAuthor(commentContainer);
    const publishedAt = selectOrThrow(
      commentContainer,
      "#published-time-text",
      HTMLElement
    ).innerText;

    // TODO review content capture to include emojis
    const commentTextHandle = selectOrThrow(
      commentContainer,
      "#content-text",
      HTMLElement
    );

    const commentText = commentTextHandle.innerText.trim();

    const boundingBox = commentContainer.getBoundingClientRect();
    const commentPre: CommentPreScreenshot = {
      comment: {
        textContent: commentText,
        author: author,
        publishedAt: publishedAt,
        scrapedAt: scrapDate,
        // TODO capture replies
        replies: [],
        nbLikes: 0, // Voir https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
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
    commentContainer: HTMLElement
  ): Promise<Author> {
    const authorTextHandle = selectOrThrow(
      commentContainer,
      "a#author-text",
      HTMLAnchorElement
    );
    const commentAuthor = authorTextHandle.innerText.trim();
    const commentAuthorHref = authorTextHandle?.href;

    const author: Author = {
      name: commentAuthor,
      accountHref: commentAuthorHref,
    };
    return author;
  }
}
