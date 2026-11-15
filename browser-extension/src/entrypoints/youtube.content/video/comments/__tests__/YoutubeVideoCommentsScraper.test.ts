// @vitest-environment happy-dom

import { Image } from "image-js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { DocumentDescendantsScreenshotProvider } from "@/shared/screenshoting";
import { YoutubeVideoCommentsScraper } from "../YoutubeVideoCommentsScraper";
import { YoutubeVideoLoadedCommentsScraper } from "../YoutubeVideoLoadedCommentsScraper";

const { buildElementScreenshots } = vi.hoisted(() => ({
  buildElementScreenshots: vi.fn((elements: HTMLElement[]) =>
    Promise.resolve(elements.map(() => new Image(2, 2))),
  ),
}));

vi.mock("@/shared/screenshoting", () => ({
  DocumentDescendantsScreenshotProvider: vi.fn(
    function MockDocumentDescendantsScreenshotProvider() {
      return { buildElementScreenshots };
    },
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

  test("scrapes one continuation page at a time", async () => {
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

    const appendScreenshots = vi.fn(() => Promise.resolve());
    const scraper = new YoutubeVideoCommentsScraper(
      support,
      new ProgressManager(vi.fn()),
      commentsContainer,
      2,
      appendScreenshots,
    );
    const { comments, metadata } = await scraper.scrapComments();
    expect(metadata).toEqual({
      expectedCommentsCount: 2,
      commentsLimit: 4000,
      limitReached: false,
      filteredCommentsCount: 0,
      screenshotsEnabled: true,
    });

    expect(comments.map((comment) => comment.commentId)).toEqual([
      "first",
      "second",
    ]);
    expect(JSON.stringify(comments)).not.toContain("screenshotData");
    expect(DocumentDescendantsScreenshotProvider).toHaveBeenCalledTimes(2);
    expect(appendScreenshots).toHaveBeenCalledTimes(2);
    expect(buildElementScreenshots.mock.calls[0]?.[0]).toEqual([
      firstThread.querySelector("#comment-container"),
    ]);
    expect(buildElementScreenshots.mock.calls[1]?.[0]).toEqual([
      secondThread.querySelector("#comment-container"),
    ]);
  });

  test("does not capture invisible duplicate comments", async () => {
    const visibleThread = commentThread("visible", "Visible comment");
    const invisibleThread = commentThread("duplicate", "Invisible duplicate");
    const invisibleContainer =
      invisibleThread.querySelector<HTMLElement>("#comment-container")!;
    const support = new ScrapingSupport(new AbortController().signal);
    vi.spyOn(support, "isVisible").mockImplementation(
      (element) => element !== invisibleContainer,
    );
    const screenshotProvider = { buildElementScreenshots };

    const { comments, filteredCommentsCount } =
      await new YoutubeVideoLoadedCommentsScraper(
        support,
        screenshotProvider,
        2,
        new ProgressManager(vi.fn()),
        new Set(),
      ).scrapRootCommentThreads([visibleThread, invisibleThread]);

    expect(comments.map((comment) => comment.commentId)).toEqual(["visible"]);
    expect(filteredCommentsCount).toBe(1);
    expect(buildElementScreenshots).toHaveBeenCalledWith(
      [visibleThread.querySelector("#comment-container")],
      expect.any(ProgressManager),
    );
  });
  test("includes exclusions from replies in the returned metadata", async () => {
    const commentsContainer = document.querySelector<HTMLElement>("#comments")!;
    const root = commentThread("root", "Root comment");
    root.insertAdjacentHTML(
      "beforeend",
      '<div id="replies"><div id="expanded-threads"></div></div>',
    );
    const duplicate = commentThread("root", "Duplicate root in replies");
    duplicate.append(commentThread("discarded-child", "Discarded descendant"));
    for (const reply of [duplicate, commentThread("reply", "Retained reply")]) {
      const wrapper = document.createElement("yt-sub-thread");
      wrapper.innerHTML = '<div class="ytSubThreadSubThreadContent"></div>';
      wrapper.firstElementChild!.append(reply);
      root.querySelector("#expanded-threads")!.append(wrapper);
    }
    commentsContainer.querySelector("#contents")!.append(root);
    commentsContainer.querySelector("#continuations")!.remove();
    const support = new ScrapingSupport(new AbortController().signal);
    vi.spyOn(support, "isVisible").mockReturnValue(true);

    const { comments, metadata } = await new YoutubeVideoCommentsScraper(
      support,
      new ProgressManager(vi.fn()),
      commentsContainer,
      4,
      vi.fn(),
    ).scrapComments();

    expect(comments.map((comment) => comment.commentId)).toEqual(["root"]);
    expect(comments[0]!.replies.map((reply) => reply.commentId)).toEqual([
      "reply",
    ]);
    expect(metadata.filteredCommentsCount).toBe(2);
  });

  test("records the cap and filtered duplicate occurrences in a batch", async () => {
    const commentsContainer = document.querySelector<HTMLElement>("#comments")!;
    const contents = commentsContainer.querySelector<HTMLElement>("#contents")!;
    const duplicate = commentThread("first", "Duplicate");
    duplicate.append(commentThread("discarded-child", "Loaded descendant"));
    contents.append(commentThread("first", "First comment"), duplicate);
    const continuation =
      commentsContainer.querySelector<HTMLElement>("#continuations")!;
    const loadContinuation = vi.fn();
    continuation.scrollIntoView = loadContinuation;
    const support = new ScrapingSupport(new AbortController().signal);
    vi.spyOn(support, "isVisible").mockReturnValue(true);
    const scraper = new YoutubeVideoCommentsScraper(
      support,
      new ProgressManager(vi.fn()),
      commentsContainer,
      100,
      vi.fn(),
      false,
      1,
    );
    const { comments, metadata } = await scraper.scrapComments();
    expect(comments).toHaveLength(1);
    expect(loadContinuation).not.toHaveBeenCalled();
    expect(metadata).toEqual({
      expectedCommentsCount: 100,
      commentsLimit: 1,
      limitReached: true,
      filteredCommentsCount: 2,
      screenshotsEnabled: true,
    });
  });
  test("records disabled screenshots and an unreached cap for an empty post", async () => {
    const scraper = new YoutubeVideoCommentsScraper(
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(vi.fn()),
      document.createElement("div"),
      0,
      vi.fn(),
      true,
      10,
    );
    const { comments, metadata } = await scraper.scrapComments();
    expect(comments).toEqual([]);
    expect(metadata).toEqual({
      expectedCommentsCount: 0,
      commentsLimit: 10,
      limitReached: false,
      filteredCommentsCount: 0,
      screenshotsEnabled: false,
    });
  });
});
