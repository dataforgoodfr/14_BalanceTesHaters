// @vitest-environment happy-dom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { YoutubeVideoCommentThreadContentLoader } from "../YoutubeVideoCommentThreadContentLoader";

function commentThread(): HTMLElement {
  const thread = document.createElement("ytd-comment-thread-renderer");
  thread.innerHTML = `
    <div id="replies">
      <div id="more-replies"><button class="initial-replies"></button></div>
      <button class="more-replies" aria-label="Show more replies"></button>
    </div>
    <button id="more" class="read-more"></button>
  `;
  return thread;
}

describe("YoutubeVideoCommentThreadContentLoader", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  test("loads replies and long comments only inside the supplied root", async () => {
    const selectedRoot = commentThread();
    const otherRoot = commentThread();
    document.body.append(selectedRoot, otherRoot);
    const selectedButtons = Array.from(
      selectedRoot.querySelectorAll<HTMLButtonElement>("button"),
    );
    const otherButtons = Array.from(
      otherRoot.querySelectorAll<HTMLButtonElement>("button"),
    );
    const selectedClicks = selectedButtons.map((button) =>
      vi.spyOn(button, "click"),
    );
    const otherClicks = otherButtons.map((button) => vi.spyOn(button, "click"));

    const support = new ScrapingSupport(new AbortController().signal);
    vi.spyOn(support, "isVisible").mockReturnValue(true);
    vi.spyOn(support, "sleep").mockResolvedValue();

    await new YoutubeVideoCommentThreadContentLoader(support).loadThreadContent(
      {
        commentId: "selected",
        element: selectedRoot,
      },
    );

    expect(selectedClicks.map((click) => click.mock.calls.length)).toEqual([
      1, 1, 1,
    ]);
    expect(otherClicks.every((click) => click.mock.calls.length === 0)).toBe(
      true,
    );
  });
});
