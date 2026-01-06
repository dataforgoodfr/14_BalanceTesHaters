import {
  Page,
  ElementHandle,
} from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { BaseScraper } from "../base-scraper";
import { type Post, type Comment, Author } from "../../../shared/model/post";
import { parseSocialNetworkUrl } from "@/entrypoints/shared/social-network-url";
import { currentIsoDate } from "../utils/current-iso-date";

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
    const { publishedAt, publishedAtRelative, text } =
      await this.scrapPostPublishedAtAndText(page);
    const comments: Comment[] = await this.scrapPostComments(page);

    return {
      postId: postId,
      socialNetwork: "YOUTUBE",
      scrapTimestamp: scrapTimestamp,

      url: postUrl,
      author: author,
      publishedAt: publishedAt,
      publishedAtRelative: publishedAtRelative,
      text: text,
      comments: comments,
    };
  }

  private async scrapPostPublishedAtAndText(postPage: Page): Promise<{
    publishedAt: string | undefined;
    publishedAtRelative: boolean | undefined;
    text: string;
  }> {
    const snippetText = await innertText(
      (await postPage.$("#description #snippet-text"))!
    );
    const publishedAt =
      (await ariaLabel((await postPage.$("#description #date-text"))!)) ??
      undefined;
    return {
      publishedAt: publishedAt,
      publishedAtRelative: true,
      text: snippetText,
    };
  }

  private async scrapPostAuthor(postPage: Page): Promise<Author> {
    const postOwnerEl = (await postPage.$("#owner"))!;
    const channelNameEl = (await postOwnerEl.$("#channel-name"))!;
    const link = (await channelNameEl.$("a"))!;
    const channelName = await innertText(link);
    const channelUrl = await anchorHref(link);
    return {
      name: channelName,
      accountUrl: channelUrl,
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
        const authorTextHandle = await commentContainer.$("#author-text");
        const commentTextHandle = await commentContainer.$("#content-text");
        const commentAuthor = (
          await page.evaluate(
            (e) => (e as HTMLElement).innerText,
            authorTextHandle
          )
        )?.trim();
        const commentText = (
          await page.evaluate(
            (e) => (e as HTMLElement).innerText,
            commentTextHandle
          )
        )?.trim();
        const screenshotData = this.uintArrayScreenshotToBase64Url(
          await commentContainer.screenshot()
        );
        const screenshotDate = currentIsoDate();

        const comment: Comment = {
          author: {
            name: commentAuthor,
            // TODO extract href
          },
          commentText: commentText,
          screenshotDataUrl: screenshotData,
          screenshotDate,
          // TODO extrat comment relative date
          // TODO capture replies
          replies: [],
        };
        return comment;
      })
    );
    return comments;
  }

  private uintArrayScreenshotToBase64Url(pngData: Uint8Array): string {
    let binary = "";
    const len = pngData.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pngData[i]);
    }
    const base64 = btoa(binary);
    return "data:image/png;base64," + base64;
  }
}

async function innertText(element: ElementHandle): Promise<string> {
  return await element.evaluate((e) => (e as HTMLElement).innerText, element);
}

async function anchorHref(
  element: ElementHandle<HTMLAnchorElement>
): Promise<string> {
  return await element.evaluate((e) => e.href, element);
}

async function ariaLabel(element: ElementHandle): Promise<string | null> {
  return await element.evaluate((e) => (e as HTMLElement).ariaLabel, element);
}
