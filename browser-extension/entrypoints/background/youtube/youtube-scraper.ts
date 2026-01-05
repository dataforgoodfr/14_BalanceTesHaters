import { ElementHandle } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { BaseScraper } from "../base-scraper";
import { type Post, type Comment } from "../model";

export class YoutubeScraper extends BaseScraper {
  async scrapTab(tab: Browser.tabs.Tab): Promise<Post> {
    const page = await this.getBrowserPageFromTab(tab);

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
        const screenshotData = this.uintArraySCreenshotToBase64Url(
          await commentContainer.screenshot()
        );
        const comment: Comment = {
          autor: {
            name: commentAuthor,
            // TODO extract href
          },
          text: commentText,
          screenshotDataUrl: screenshotData,
          commentDate: new Date(Date.now()),
          // TODO capture replies
          replies: [],
        };
        return comment;
      })
    );

    console.log("comments", comments);

    return {
      url: tab.url!,
      author: {
        // TODO capture post author
        name: "Unknown",
        accountHref: "",
      },
      // TODO capture post text
      publishedAt: new Date(Date.now()),
      comments: comments,
    };
  }

  private uintArraySCreenshotToBase64Url(pngData: Uint8Array): string {
    let binary = "";
    const len = pngData.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pngData[i]);
    }
    const base64 = btoa(binary);
    return "data:image/png;base64," + base64;
  }
}
