// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { InstagramCommentThreadContentLoader } from "../InstagramCommentThreadContentLoader";

describe("InstagramCommentThreadContentLoader", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("waits for delayed replies and expands subsequent pages before returning", async () => {
    const thread = document.createElement("div");
    thread.innerHTML = "<div></div><div><ul></ul></div>";
    const replies = thread.querySelector("ul")!;
    const button = document.createElement("div");
    button.setAttribute("role", "button");
    button.innerText = "View all 2 replies";
    thread.append(button);
    let clicks = 0;
    button.addEventListener("click", () => {
      clicks++;
      button.remove();
      // Instagram temporarily removes the button while fetching replies.
      const spinner = document.createElement("div");
      spinner.setAttribute("role", "progressbar");
      setTimeout(() => thread.append(spinner), 300);
      setTimeout(() => {
        spinner.remove();
        replies.append(document.createElement("div"));
        if (clicks === 1) thread.append(button);
      }, 2_000);
    });
    const loader = new InstagramCommentThreadContentLoader(
      new ScrapingSupport(new AbortController().signal),
    );

    const pending = loader.loadReplies({ threadElements: [thread] });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(replies.children).toHaveLength(0);
    await vi.runAllTimersAsync();
    await pending;

    expect(clicks).toBe(2);
    expect(replies.children).toHaveLength(2);
  });

  it.each([
    [
      "Voir les 37 réponses",
      "Afficher plus de réponses",
      "Masquer toutes les réponses",
    ],
    ["View all 37 replies", "View more replies", "Hide all replies"],
  ])(
    "loads every reply page after %s",
    async (initialText, moreText, hideText) => {
      const thread = document.createElement("div");
      thread.innerHTML = "<div></div><div><ul></ul></div>";
      const replies = thread.querySelector("ul")!;
      const button = document.createElement("div");
      button.setAttribute("role", "button");
      button.innerText = initialText;
      thread.append(button);
      const pages = [15, 15, 7];
      const click = vi.fn(() => {
        button.remove();
        const count = pages.shift()!;
        setTimeout(() => {
          for (let index = 0; index < count; index++)
            replies.append(document.createElement("div"));
          button.innerText = pages.length > 0 ? moreText : hideText;
          thread.append(button);
        }, 2_000);
      });
      button.addEventListener("click", click);
      const loader = new InstagramCommentThreadContentLoader(
        new ScrapingSupport(new AbortController().signal),
      );

      const pending = loader.loadReplies({ threadElements: [thread] });
      await vi.runAllTimersAsync();
      await pending;

      expect(replies.children).toHaveLength(37);
      expect(click).toHaveBeenCalledTimes(3);
    },
  );

  it.each([false, true])(
    "waits for replies without a spinner, with persistent button: %s",
    async (persistentButton) => {
      const thread = document.createElement("div");
      thread.innerHTML = "<div></div><div><ul></ul></div>";
      const replies = thread.querySelector("ul")!;
      const button = document.createElement("div");
      button.setAttribute("role", "button");
      button.innerText = "View all 1 replies";
      thread.append(button);
      const click = vi.fn(() => {
        if (!persistentButton) button.remove();
        setTimeout(() => {
          replies.append(document.createElement("div"));
          button.remove();
        }, 2_000);
      });
      button.addEventListener("click", click);
      const loader = new InstagramCommentThreadContentLoader(
        new ScrapingSupport(new AbortController().signal),
      );
      let finished = false;
      const pending = loader
        .loadReplies({ threadElements: [thread] })
        .then(() => {
          finished = true;
        });

      await vi.advanceTimersByTimeAsync(1_500);
      expect(finished).toBe(false);
      expect(click).toHaveBeenCalledTimes(1);
      await vi.runAllTimersAsync();
      await pending;
      expect(replies.children).toHaveLength(1);
      expect(click).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["Masquer toutes les réponses", "Hide all replies"])(
    "allows an expanded group with no visible replies: %s",
    async (hideText) => {
      const thread = document.createElement("div");
      thread.innerHTML = "<div></div><div><ul></ul></div>";
      const button = document.createElement("div");
      button.setAttribute("role", "button");
      button.innerText = "View all 1 replies";
      thread.append(button);
      button.addEventListener("click", () => {
        button.innerText = hideText;
      });
      const loader = new InstagramCommentThreadContentLoader(
        new ScrapingSupport(new AbortController().signal),
      );
      let finished = false;
      const pending = loader
        .loadReplies({ threadElements: [thread] })
        .then(() => {
          finished = true;
        });

      await vi.advanceTimersByTimeAsync(29_000);
      expect(finished).toBe(false);
      await vi.runAllTimersAsync();
      await pending;
      expect(finished).toBe(true);
    },
  );

  it("fails when a reply request stays stuck instead of scraping incomplete replies", async () => {
    const thread = document.createElement("div");
    thread.innerHTML = '<div role="progressbar"></div>';
    const loader = new InstagramCommentThreadContentLoader(
      new ScrapingSupport(new AbortController().signal),
    );
    const outcome = loader
      .loadReplies({ threadElements: [thread] })
      .catch((error: unknown) => error);

    await vi.runAllTimersAsync();

    expect(await outcome).toHaveProperty(
      "message",
      "Timed out waiting for Instagram replies after 30000ms without progress.",
    );
  });
});
