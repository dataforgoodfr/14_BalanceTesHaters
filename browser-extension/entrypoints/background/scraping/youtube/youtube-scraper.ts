import {
  Page,
  ElementHandle,
} from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { BaseScraper } from "../base-scraper";
import { type Post, type Comment, Author } from "../../../shared/model/post";
import { parseSocialNetworkUrl } from "@/entrypoints/shared/social-network-url";
import { currentIsoDate } from "../utils/current-iso-date";
import { innerText } from "../utils/innerText";
import { anchorHref } from "../utils/anchorHref";
import { ariaLabel } from "../utils/ariaLabel";

export class YoutubeScraper extends BaseScraper {
  extractPostId(url: string): string {
    const parsed = parseSocialNetworkUrl(url);
    if (!parsed) {
      throw new Error("Unexpected");
    }
    return parsed.postId;
  }

  async scrapTab(tab: Browser.tabs.Tab): Promise<Post> {
    const postUrl = tab.url!;
    const postId = this.extractPostId(postUrl);
    const page = await this.getBrowserPageFromTab(tab);
    const scrapTimestamp = currentIsoDate();

    const author = await this.scrapPostAuthor(page);
    const textConent = await this.scrapPostTextContent(page);

    const title = await innerText(
      (await page.$(".watch-active-metadata #title"))!
    );

    const publishedAt = await this.scrapPostPublishedAt(page);
    const comments: Comment[] = await this.scrapPostComments(page);

    return {
      postId: postId,
      socialNetwork: "YOUTUBE",
      scrapedAt: scrapTimestamp,

      url: postUrl,
      author: author,
      publishedAt: publishedAt,
      textContent: textConent,
      comments: comments,
      title,
    };
  }

  private async scrapPostTextContent(page: Page) {
    return await innerText((await page.$("#description #snippet-text"))!);
  }

  private async scrapPostPublishedAt(postPage: Page): Promise<string> {
    const publishedAt = await innerText(
      (await postPage.$("#description #info span:last-child"))!
    );

    return publishedAt ?? "";
  }

  private async scrapPostAuthor(postPage: Page): Promise<Author> {
    const postOwnerEl = (await postPage.$("#owner"))!;
    const channelNameEl = (await postOwnerEl.$("#channel-name"))!;
    const link = (await channelNameEl.$("a"))!;
    const channelName = await innerText(link);
    const channelUrl = await anchorHref(link);
    return {
      name: channelName,
      accountHref: channelUrl,
    };
  }

  private async scrapPostComments(page: Page): Promise<Comment[]> {
    const commentsSectionHandle: ElementHandle = (await page.$("#comments"))!;
    commentsSectionHandle.scrollIntoView();

    const sortMenu = (await commentsSectionHandle.waitForSelector(
      "#sort-menu"
    ))!;
    console.debug("Open sort menu");
    (await sortMenu.$("#trigger"))?.click();
    console.debug("Click second element");
    (await sortMenu.$("a:nth-child(2)"))?.click();

    // TODO implement
    // await loadAllTopLevelComments(commentsSectionHandle);
    // await expandReplies(commentsSectionHandle)
    // await expandLongComments(commentsSectionHandle)
    await commentsSectionHandle.waitForSelector("#comment-container");
    const commentContainers = await commentsSectionHandle.$$(
      "#comment-container"
    );

    const comments: Comment[] = await Promise.all(
      Array.from(commentContainers).map(async (commentContainer) => {
        const scrapDate = currentIsoDate();

        const author: Author = await this.scrapCommentAuthor(commentContainer);
        const publishedAt = await innerText(
          (await commentContainer.$("#published-time-text"))!
        );

        // TODO review content capture to include emojis
        const commentTextHandle = await commentContainer.$("#content-text");
        const commentText = (
          await page.evaluate(
            (e) => (e as HTMLElement).innerText,
            commentTextHandle
          )
        )?.trim();
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
        };
        return comment;
      })
    );
    return comments;
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
