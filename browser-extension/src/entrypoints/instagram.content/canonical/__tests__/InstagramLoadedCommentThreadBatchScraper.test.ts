// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import {
  imageToPngBase64,
  type ElementScreenshotProvider,
} from "@/shared/screenshoting";
import { InstagramLoadedCommentThreadBatchScraper } from "../InstagramLoadedCommentThreadBatchScraper";
import { Image } from "image-js";

function commentMarkup(id: string): string {
  return `
    <div id="${id}">
      <div>
        <div></div>
        <div><div>
          <div><div>
            <div><a href="https://www.instagram.com/author/">author</a></div>
            <div>Text of ${id}</div>
          </div></div>
          <a href="https://www.instagram.com/p/post/c/${id}/">
            <time datetime="2026-10-05T00:00:00.000Z"></time>
          </a>
        </div></div>
      </div>
    </div>
  `;
}

describe("InstagramLoadedCommentThreadBatchScraper", () => {
  it("preserves comment and reply hierarchy with their corresponding screenshots", async () => {
    const commentsContainer = document.createElement("div");
    commentsContainer.innerHTML = `
      <div id="thread-1">
        ${commentMarkup("comment-1")}
        <div><ul>${commentMarkup("reply-1")}${commentMarkup("reply-2")}</ul></div>
      </div>
      <div id="thread-2">${commentMarkup("comment-2")}</div>
    `;
    const screenshotsById = new Map(
      ["comment-1", "reply-1", "reply-2", "comment-2"].map((id, index) => [
        id,
        new Image(index + 1, 1),
      ]),
    );
    const screenshotProvider: ElementScreenshotProvider = {
      buildElementScreenshots: (elements) =>
        Promise.resolve(
          elements.map((element) => screenshotsById.get(element.id)!),
        ),
    };
    const scraper = new InstagramLoadedCommentThreadBatchScraper(
      new ScrapingSupport(new AbortController().signal),
      screenshotProvider,
    );

    const result = await scraper.scrapBatch({
      threadElements: [
        commentsContainer.querySelector<HTMLElement>("#thread-1")!,
        commentsContainer.querySelector<HTMLElement>("#thread-2")!,
      ],
    });

    const expectedComment = (id: string) => ({
      type: "text",
      data: {
        commentId: id,
        textContent: `Text of ${id}`,
        screenshotData: imageToPngBase64(screenshotsById.get(id)!),
      },
    });
    expect(result).toMatchObject([
      {
        comment: expectedComment("comment-1"),
        replies: [expectedComment("reply-1"), expectedComment("reply-2")],
      },
      {
        comment: expectedComment("comment-2"),
        replies: [],
      },
    ]);
  });
});
