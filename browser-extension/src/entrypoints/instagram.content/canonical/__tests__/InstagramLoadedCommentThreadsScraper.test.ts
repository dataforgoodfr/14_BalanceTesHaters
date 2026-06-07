// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  InstagramLoadedCommentThreadsScraper,
  InstagramCommentThread,
} from "../InstagramLoadedCommentThreadsScraper";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ElementScreenshotProvider } from "@/shared/screenshoting";
import { Image } from "image-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dummyScreenshotImage = new Image(5, 5);
const dummyScreenshotProvider: ElementScreenshotProvider = {
  buildElementScreenshot: () => Promise.resolve(dummyScreenshotImage),
};

async function scrapLoadedCommentThreads(
  htmlFragmentFile: string,
): Promise<InstagramCommentThread[]> {
  const commentsContainerHTML = readFileSync(
    resolve(__dirname, htmlFragmentFile),
    "utf-8",
  );

  document.location.assign("https://www.instagram.com/");

  const wrapper = document.createElement("div");
  wrapper.innerHTML = commentsContainerHTML;

  const commentsContainer = wrapper.firstElementChild as HTMLElement;

  const abortController = new AbortController();
  const scrapingSupport = new ScrapingSupport(abortController.signal);
  const progressManager = new ProgressManager(vi.fn());

  const scraper = new InstagramLoadedCommentThreadsScraper(
    commentsContainer,
    scrapingSupport,
    progressManager,
    dummyScreenshotProvider,
  );

  return await scraper.scrapLoadedCommentThreads();
}

describe("InstagramLoadedCommentThreadsScraper", () => {
  describe("comment-thread-with-replies", () => {
    let result: InstagramCommentThread[];
    beforeAll(async () => {
      result = await scrapLoadedCommentThreads(
        "commentsContainer-with-replies.html",
      );
    });
    it("should contain an text comment with 14 replies", () => {
      expect(result).toHaveLength(1);
      expect(result[0].comment).toMatchObject({
        type: "text",
        data: {
          author: {
            accountHref: "https://www.instagram.com/davi_na_dagher/",
            name: "davi_na_dagher",
          },
          commentId: "18109876459691320",
          nbLikes: 79,
          publishedAt: {
            date: "2026-03-19T09:39:23.000Z",
            type: "absolute",
          },
        },
      });
      expect(result[0].replies).toHaveLength(14);
    });
  });

  describe("comment-thread-with-image-comment", () => {
    let result: InstagramCommentThread[];
    beforeAll(async () => {
      result = await scrapLoadedCommentThreads(
        "commentsContainer-with-image-comment.html",
      );
    });
    it("should contain an image comment  ", () => {
      expect(result[0]).toMatchObject({
        comment: {
          type: "image",
        },
        replies: [],
      });
    });
  });

  describe("comment-thread-with-fb-comments", () => {
    let result: InstagramCommentThread[];
    beforeAll(async () => {
      result = await scrapLoadedCommentThreads(
        "commentsContainer-with-fb-comments.html",
      );
    });
    it("should contain a fb comment placeholder ", () => {
      expect(result[0]).toMatchObject({
        comment: {
          type: "fb-comments",
        },
        replies: [],
      });
    });
  });
});
