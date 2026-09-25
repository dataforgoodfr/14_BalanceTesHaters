// @vitest-environment happy-dom

import { Image } from "image-js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createScreenshotProviderForDocumentArea } from "@/shared/screenshoting";
import { YoutubeVideoCommentsScraper } from "../YoutubeVideoCommentsScraper";

vi.mock("@/shared/screenshoting", () => ({
  createScreenshotProviderForDocumentArea: vi.fn(() =>
    Promise.resolve({
      buildElementScreenshot: vi.fn(() => Promise.resolve(new Image(2, 2))),
    }),
  ),
}));

function commentThread(commentId: string, text: string): HTMLElement {
  const thread = document.createElement("ytd-comment-thread-renderer");
  thread.innerHTML = `
    <div id="comment-container">
      <a id="author-text" href="https://youtube.com/@author">Author</a>
      <span id="published-time-text">
        <a href="https://youtube.com/watch?v=video&lc=${commentId}">1 day ago</a>
      </span>
      <div id="content-text">${text}</div>
      <span id="vote-count-middle"></span>
    </div>
  `;
  return thread;
}

describe("YoutubeVideoCommentsScraper", () => {
  beforeEach(() => {
    document.body.innerHTML = ` 
      <div id="masthead-container"></div>
      <div id="comments">
        <div id="sort-menu">
          <button id="trigger"></button>
          <a></a><a></a>
        </div>
        <div id="contents"></div>
        <div id="continuations"></div>
      </div>
    `;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  test("scrapes and removes one continuation page at a time", async () => {
    const commentsContainer = document.querySelector<HTMLElement>("#comments")!;
    const contents = commentsContainer.querySelector<HTMLElement>("#contents")!;
    const continuation =
      commentsContainer.querySelector<HTMLElement>("#continuations")!;
    const firstThread = commentThread("first", "First comment");
    const secondThread = commentThread("second", "Second comment");
    contents.append(firstThread);
    continuation.scrollIntoView = vi.fn(() => {
      contents.append(secondThread);
      continuation.remove();
    });

    const support = new ScrapingSupport(new AbortController().signal);
    vi.spyOn(support, "isVisible").mockReturnValue(true);

    const comments = await new YoutubeVideoCommentsScraper(
      support,
      new ProgressManager(vi.fn()),
      commentsContainer,
      2,
    ).scrapComments();

    expect(comments.map((comment) => comment.commentId)).toEqual([
      "first",
      "second",
    ]);
    expect(firstThread.isConnected).toBe(false);
    expect(secondThread.isConnected).toBe(false);
    expect(createScreenshotProviderForDocumentArea).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(createScreenshotProviderForDocumentArea).mock.calls[0]?.[0],
    ).toEqual([firstThread]);
    expect(
      vi.mocked(createScreenshotProviderForDocumentArea).mock.calls[1]?.[0],
    ).toEqual([secondThread]);
  });
});
