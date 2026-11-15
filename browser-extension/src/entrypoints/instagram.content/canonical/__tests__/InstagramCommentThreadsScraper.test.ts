// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";
import type { ScrapingScreenshots } from "@/shared/model/scraping/ScrapingScreenshots";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { InstagramCommentThreadsScraper } from "../InstagramCommentThreadsScraper";

const commentHtml = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "comment-authenticated.html",
  ),
  "utf8",
);

function commentThread(commentId: string): HTMLElement {
  const thread = document.createElement("div");
  thread.innerHTML = commentHtml;
  thread.querySelector<HTMLAnchorElement>("a:has(time)")!.href =
    `https://www.instagram.com/p/post/c/${commentId}/`;
  return thread;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it("records stopping at the configured comment limit", async () => {
  vi.useFakeTimers();
  document.body.innerHTML =
    "<main><hr/><div><div><div id='comments'></div></div></div></main>";
  const commentIds = Array.from({ length: 51 }, (_, index) => `${index + 1}`);
  document.querySelector("#comments")!.append(...commentIds.map(commentThread));
  const screenshots: ScrapingScreenshots = {};
  const scraper = new InstagramCommentThreadsScraper(
    new ScrapingSupport(new AbortController().signal),
    new ProgressManager(() => {}),
    commentIds.length,
    (batchScreenshots) => {
      Object.assign(screenshots, batchScreenshots);
      return Promise.resolve();
    },
    true,
    50,
  );

  const pendingComments = scraper.scrapCommentThreads();
  await vi.runAllTimersAsync();
  const { comments, metadata } = await pendingComments;

  expect(comments.map((comment) => comment.commentId)).toEqual(
    commentIds.slice(0, 50),
  );
  expect(Object.keys(screenshots).sort()).toEqual(
    comments.map((comment) => comment.id).sort(),
  );
  expect(JSON.stringify(comments)).not.toContain("screenshotData");
  expect(metadata).toEqual({
    expectedCommentsCount: 51,
    commentsLimit: 50,
    limitReached: true,
    filteredCommentsCount: 0,
    screenshotsEnabled: false,
  });
});
