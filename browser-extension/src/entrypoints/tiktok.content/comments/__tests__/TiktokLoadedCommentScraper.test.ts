// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  CommentWithoutReplies,
  TiktokLoadedCommentScraper,
} from "../TiktokLoadedCommentScraper";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ElementScreenshotProvider } from "@/shared/screenshoting";
import { Image } from "image-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dummyScreenshotImage = new Image(5, 5);
const dummyScreenshotProvider: ElementScreenshotProvider = {
  buildElementScreenshot: () => Promise.resolve(dummyScreenshotImage),
};

async function scrapComment(
  htmlFragmentFile: string,
): Promise<CommentWithoutReplies> {
  const commentHTML = readFileSync(
    resolve(__dirname, htmlFragmentFile),
    "utf-8",
  );

  document.location.assign("https://www.tiktok.com/");

  const wrapper = document.createElement("div");
  wrapper.innerHTML = commentHTML;

  const commentElement = wrapper.firstElementChild as HTMLElement;

  const abortController = new AbortController();
  const scrapingSupport = new ScrapingSupport(abortController.signal);

  const scraper = new TiktokLoadedCommentScraper(
    commentElement,
    dummyScreenshotProvider,
    scrapingSupport,
  );

  return await scraper.scrapLoadedComment();
}

describe("TiktokLoadedCommentScraper", () => {
  describe("single parent comment", () => {
    let result: CommentWithoutReplies;
    beforeAll(async () => {
      result = await scrapComment("single-comment-item.html");
    });

    it("should extract the author account href", () => {
      expect(result.author).toMatchObject({
        name: "@trampolean",
        accountHref: "https://www.tiktok.com/@trampolean",
      });
    });

    it("should extract the text content", () => {
      expect(result.textContent).toEqual("Comment content 👍");
    });

    it("should extract publishedAt", () => {
      expect(result.publishedAt).toMatchObject({
        type: "relative",
        dateText: "",
      });
    });

    it("should extract commentId and url", () => {
      expect(result.commentId).toBeTypeOf("string");
      expect(result.url).toContain("tiktok.com");
    });

    it("should extract nbLikes", () => {
      expect(result.nbLikes).toEqual(237);
    });

    it("should include a screenshotData as base64 encoded PNG", () => {
      expect(result.screenshotData).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(result.screenshotData.length).toBeGreaterThan(0);
    });

    it("should include scrapedAt as ISO datetime", () => {
      expect(result.scrapedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should include id as a UUID", () => {
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });
});
