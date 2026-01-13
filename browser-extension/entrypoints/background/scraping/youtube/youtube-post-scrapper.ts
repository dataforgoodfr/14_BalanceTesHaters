import { Author, Post, Comment } from "@/entrypoints/shared/model/post";
import { SocialNetworkUrlInfo } from "@/entrypoints/shared/social-network-url";
import {
  ElementHandle,
  Page,
} from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { innerText } from "../puppeteer/innerText";
import { selectOrThrow } from "../puppeteer/selectOrThrow";
import { anchorHref } from "../puppeteer/anchorHref";
import { currentIsoDate } from "../utils/current-iso-date";
import { ariaLabel } from "../puppeteer/ariaLabel";

const LOG_PREFIX = "YoutubePostScrapper -";
export class YoutubePostScrapper {
  private readonly page: Page;
  private readonly urlInfo: SocialNetworkUrlInfo;
  private readonly url: string;

  public constructor(page: Page, url: string, urlInfo: SocialNetworkUrlInfo) {
    this.page = page;

    this.urlInfo = urlInfo;
    this.url = url;
  }

  private debug(...data: typeof console.debug.arguments) {
    console.debug(LOG_PREFIX, ...data);
  }

  async scrapPost(): Promise<Post> {
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
      postId: this.urlInfo.postId,
      socialNetwork: "YOUTUBE",
      scrapedAt: scrapTimestamp,
      url: this.url,
      author: author,
      publishedAt: publishedAt,
      textContent: textConent,
      comments: comments,
      title,
    };
  }

  private async scrapPostTitle() {
    return await innerText(
      (await this.page.$(".watch-active-metadata #title"))!,
    );
  }

  private async scrapPostTextContent() {
    return await innerText((await this.page.$("#description #snippet-text"))!);
  }

  private async scrapPostPublishedAt(): Promise<string> {
    const descElement = (await this.page.waitForSelector("#description"))!;
    descElement.scrollIntoView();

    const dateTextElement = (await this.page.waitForSelector(
      "#description #date-text",
    ))!;
    return (await ariaLabel(dateTextElement))?.trim() ?? "";
  }

  private async scrapPostAuthor(): Promise<Author> {
    const channelNameEl = (await this.page.$("#owner #channel-name"))!;
    if (channelNameEl && (await channelNameEl.isVisible())) {
      const channelName = await innerText(channelNameEl);

      const link = await selectOrThrow(channelNameEl, "a");
      const channelUrl = await anchorHref(link);
      return {
        name: channelName,
        accountHref: channelUrl,
      };
    }
    const attributedChannelNameEl = (await this.page.$(
      "#owner #attributed-channel-name",
    ))!;
    if (
      attributedChannelNameEl &&
      (await attributedChannelNameEl.isVisible())
    ) {
      const channelName = await innerText(attributedChannelNameEl);

      const link = await selectOrThrow(attributedChannelNameEl, "a");
      const channelUrl = await anchorHref(link);
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
    const commentsSectionHandle: ElementHandle =
      (await this.page.$("#comments"))!;
    commentsSectionHandle.scrollIntoView();

    /*  this.debug("Sorting comments by newest...");
      await this.sortCommentsByNewest();*/

    this.debug("Loading all comment threads...");
    await this.loadAllTopLevelComments();
    /*
      this.debug("Expanding all replies...");
      await this.loadAllReplies();*/

    // this.debug("Expanding long comments...");
    // await expandLongComments(commentsSectionHandle)

    this.debug("Capturing loaded comments...");
    await commentsSectionHandle.waitForSelector("#comment-container");
    const commentContainers =
      await commentsSectionHandle.$$("#comment-container");
    for (const commentContainer of commentContainers) {
      // nsure all is loaded
      await commentContainer.scrollIntoView();
    }

    const comments: Comment[] = await Promise.all(
      Array.from(commentContainers).map(async (commentContainer) => {
        return await this.scrapComment(commentContainer);
      }),
    );
    return comments;
  }

  private async scrapComment(commentContainer: ElementHandle<Element>) {
    const scrapDate = currentIsoDate();

    const author: Author = await this.scrapCommentAuthor(commentContainer);
    const publishedAt = await innerText(
      (await commentContainer.$("#published-time-text"))!,
    );

    // TODO review content capture to include emojis
    const commentTextHandle = await commentContainer.$("#content-text");
    const commentText = (
      await this.page.evaluate(
        (e) => (e as HTMLElement).innerText,
        commentTextHandle,
      )
    )?.trim();
    await commentContainer.scrollIntoView();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const screenshotData = await commentContainer.screenshot({
      encoding: "base64",
    });

    const comment: Comment = {
      textContent: commentText,
      author: author,
      publishedAt: publishedAt,
      screenshotData: screenshotData,
      scrapedAt: scrapDate,
      // TODO extract comment relative date
      // TODO capture replies
      replies: [],
      nbLikes: 0, // Voir https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
    };
    return comment;
  }

  private async sortCommentsByNewest() {
    const sortMenu = (await this.page.waitForSelector("#comments #sort-menu"))!;
    (await sortMenu.$("#trigger"))?.click();
    // Not sure why by puppeteer click is not working properly
    (await sortMenu.$("a:nth-child(2)"))?.evaluate((e) => e.click());
  }

  private async loadAllTopLevelComments(): Promise<void> {
    // In youtube a loader is already present at the end of the list of comment
    // Comment actual loading is triggered when the loader is scrolled into view
    // Spinner is disappearing briefly while new comments are rendered

    // Use evaluate because puppeteer code was too flaky

    await this.page.evaluate(async () => {
      function isVisible(element: Element): boolean {
        return element.getBoundingClientRect().height > 0;
      }
      let previousCommentsCount = undefined;
      let previousSpinnersCount = undefined;
      let lastChangeTime = Date.now();
      for (;;) {
        const spinners = Array.from(
          document.querySelectorAll("#comments #spinner"),
        ).filter(isVisible);
        const comments = Array.from(
          document.querySelectorAll("#comments ytd-comment-thread-renderer"),
        ).filter(isVisible);
        console.log(
          "BTH - comments:",
          comments.length,
          "spinners:",
          spinners.length,
        );
        if (spinners.length > 0) {
          const lastSpinner = spinners[spinners.length - 1];
          console.debug(
            "BTH - Found spinners scroll to last of them to trigger comment loading",
          );
          lastSpinner.scrollIntoView();
        } else if (Date.now() - lastChangeTime > 10000) {
          console.debug(
            "BTH - No more spinners found and no changes since more than 10s... consider all comments loaded.",
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
    });
  }

  private async loadAllReplies() {
    await this.page.evaluate(() => {
      const repliesButton = Array.from(
        document.querySelectorAll(
          "#replies #more-replies button" +
            "," +
            "#replies #more-replies-sub-thread button",
        ),
      )
        .filter((e) => e.getBoundingClientRect().height > 0)
        .filter((e) => e instanceof HTMLElement);
      console.debug(
        "BTH - Expanding ",
        repliesButton.length,
        " replies button...",
      );
      repliesButton.forEach((b) => {
        b.click();
      });
    });

    // expand more repleis
    await this.page.evaluate(async () => {
      for (;;) {
        const moreRepliesButtons = Array.from(
          document.querySelectorAll(
            'button[aria-label="Afficher plus de réponses"]',
          ),
        )
          .filter((b) => b.getBoundingClientRect().height > 0)
          .filter((b) => b instanceof HTMLElement);
        if (moreRepliesButtons.length === 0) {
          return;
        } else {
          console.log(
            "BTH - clicking ",
            moreRepliesButtons.length,
            " more replies buttons",
          );
          moreRepliesButtons.forEach((b) => {
            b.click();
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    });
    /*
        const repliesButtons = await this.page.$$(
          '#replies #more-replies ::-p-aria([role="button"], ' +
            '#replies #more-replies-sub-thread ::-p-aria([role="button"]'
        );
        this.debug(`${repliesButtons.length} buttons`);
        for (const button of repliesButtons) {
          await button.click();
        }*/
  }

  private async scrapCommentAuthor(commentContainer: ElementHandle<Element>) {
    const authorTextHandle = await commentContainer.$("a#author-text");
    const commentAuthor = (await innerText(authorTextHandle!)).trim();
    const commentAuthorHref = await anchorHref(authorTextHandle!);

    const author: Author = {
      name: commentAuthor,
      accountHref: commentAuthorHref,
    };
    return author;
  }
}
