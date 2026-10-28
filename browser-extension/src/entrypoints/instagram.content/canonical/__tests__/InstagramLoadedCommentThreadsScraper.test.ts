// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ElementScreenshotProvider } from "@/shared/screenshoting";
import type { InstagramComment } from "../InstagramLoadedCommentScraper";
import { InstagramLoadedCommentScraper } from "../InstagramLoadedCommentScraper";
import { InstagramLoadedCommentThreadsScraper } from "../InstagramLoadedCommentThreadsScraper";

vi.mock("../InstagramLoadedCommentScraper", () => ({
  InstagramLoadedCommentScraper: vi.fn(),
}));

const commentsByElementId: Record<string, InstagramComment> = {
  "comment-1": { type: "fb-comments", data: undefined },
  "reply-1": { type: "fb-comments", data: undefined },
  "reply-2": { type: "fb-comments", data: undefined },
  "comment-2": { type: "fb-comments", data: undefined },
};

const unusedScreenshotProvider = {} as ElementScreenshotProvider;

describe("InstagramLoadedCommentThreadsScraper", () => {
  const setProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(InstagramLoadedCommentScraper).mockImplementation(
      function (commentElement) {
        return {
          scrapLoadedComment: vi
            .fn()
            .mockResolvedValue(commentsByElementId[commentElement.id]),
        } as unknown as InstagramLoadedCommentScraper;
      },
    );
  });

  it("identifies threads, their comments and their replies", async () => {
    const commentsContainer = document.createElement("div");
    commentsContainer.innerHTML = `
      <div id="thread-1">
        <div id="comment-1"></div>
        <div><ul><div id="reply-1"></div><div id="reply-2"></div></ul></div>
      </div>
      <div>Masqués par Instagram</div>
      <div id="thread-2"><div id="comment-2"></div></div>
    `;

    const scraper = new InstagramLoadedCommentThreadsScraper(
      commentsContainer,
      new ScrapingSupport(new AbortController().signal),
      new ProgressManager(setProgress),
      unusedScreenshotProvider,
    );

    const result = await scraper.scrapLoadedCommentThreads();

    expect(result).toEqual([
      {
        comment: commentsByElementId["comment-1"],
        replies: [
          commentsByElementId["reply-1"],
          commentsByElementId["reply-2"],
        ],
      },
      {
        comment: commentsByElementId["comment-2"],
        replies: [],
      },
    ]);
    const scraperCalls = vi.mocked(InstagramLoadedCommentScraper).mock.calls;
    expect(scraperCalls.map(([element]) => element.id)).toEqual([
      "comment-1",
      "reply-1",
      "reply-2",
      "comment-2",
    ]);
    scraperCalls.forEach(([, screenshotProvider, scrapingSupport]) => {
      expect(screenshotProvider).toBe(unusedScreenshotProvider);
      expect(scrapingSupport).toBeInstanceOf(ScrapingSupport);
    });
    expect(setProgress).toHaveBeenNthCalledWith(1, 50);
    expect(setProgress).toHaveBeenNthCalledWith(2, 100);
  });
});
