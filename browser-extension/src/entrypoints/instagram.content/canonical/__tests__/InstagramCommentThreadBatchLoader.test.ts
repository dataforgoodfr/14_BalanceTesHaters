// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { InstagramCommentThreadBatchLoader } from "../InstagramCommentThreadBatchLoader";

describe("InstagramCommentThreadBatchLoader", () => {
  let scrollableContainer: HTMLElement;
  let commentsContainer: HTMLElement;
  let support: ScrapingSupport;

  beforeEach(() => {
    scrollableContainer = document.createElement("div");
    commentsContainer = document.createElement("div");
    scrollableContainer.append(commentsContainer);
    document.body.replaceChildren(scrollableContainer);
    support = new ScrapingSupport(new AbortController().signal);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("splits loaded threads using the configured batch size", async () => {
    for (let index = 0; index < 5; index++) {
      commentsContainer.append(document.createElement("div"));
    }
    const loader = new InstagramCommentThreadBatchLoader(
      support,
      scrollableContainer,
      commentsContainer,
      2,
    );

    expect(
      (await loader.loadAndIdentifyNextBatch())?.threadElements,
    ).toHaveLength(2);
    expect(
      (await loader.loadAndIdentifyNextBatch())?.threadElements,
    ).toHaveLength(2);
    expect(
      (await loader.loadAndIdentifyNextBatch())?.threadElements,
    ).toHaveLength(1);
    expect((await loader.loadAndIdentifyNextBatch()).threadElements).toEqual(
      [],
    );
  });

  test("excludes hidden rows and loading indicators from batches", async () => {
    const thread = document.createElement("div");
    const hiddenRow = document.createElement("div");
    hiddenRow.setAttribute("aria-hidden", "true");
    const spinner = document.createElement("div");
    spinner.setAttribute("role", "progressbar");
    const continuation = document.createElement("div");
    continuation.innerHTML = `
      <div style="--x-height: 42px;">
        <div data-visualcompletion="loading-state" role="progressbar">
          <svg aria-label="Chargement..." role="img"></svg>
        </div>
      </div>
    `;
    // Invalid rows come first so a missing filter changes the returned batch.
    commentsContainer.append(hiddenRow, spinner, continuation, thread);
    const loader = new InstagramCommentThreadBatchLoader(
      support,
      scrollableContainer,
      commentsContainer,
      1,
    );

    expect((await loader.loadAndIdentifyNextBatch()).threadElements).toEqual([
      thread,
    ]);
  });

  test("loads a continuation to fill the current batch", async () => {
    const firstThread = document.createElement("div");
    const spinner = document.createElement("div");
    spinner.setAttribute("role", "progressbar");
    commentsContainer.append(firstThread, spinner);
    const secondThread = document.createElement("div");
    const scrollTo = vi.fn(() => {
      commentsContainer.insertBefore(secondThread, spinner);
      spinner.remove();
    });
    scrollableContainer.scrollTo = scrollTo;
    const loader = new InstagramCommentThreadBatchLoader(
      support,
      scrollableContainer,
      commentsContainer,
      2,
    );

    expect((await loader.loadAndIdentifyNextBatch())?.threadElements).toEqual([
      firstThread,
      secondThread,
    ]);
    expect((await loader.loadAndIdentifyNextBatch()).threadElements).toEqual(
      [],
    );
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  test("rejects when continuation loading times out instead of reporting exhaustion", async () => {
    vi.useFakeTimers();
    const spinner = document.createElement("div");
    spinner.setAttribute("role", "progressbar");
    commentsContainer.append(spinner);
    scrollableContainer.scrollTo = vi.fn();
    const loader = new InstagramCommentThreadBatchLoader(
      support,
      scrollableContainer,
      commentsContainer,
    );

    const outcome = loader.loadAndIdentifyNextBatch().then(
      () => undefined,
      (error: unknown) => error,
    );
    await vi.runAllTimersAsync();

    expect(await outcome).toBeInstanceOf(Error);
    expect(await outcome).toHaveProperty(
      "message",
      "Timed out waiting for Instagram comment threads after 10000ms.",
    );
  });

  test("waits for a delayed hidden-comments button to fill the current batch", async () => {
    vi.useFakeTimers();
    const firstThread = document.createElement("div");
    const hiddenCommentsRow = document.createElement("div");
    const hiddenCommentsButton = document.createElement("button");
    hiddenCommentsButton.setAttribute("role", "button");
    hiddenCommentsButton.innerText = "View hidden comments";
    hiddenCommentsRow.append(hiddenCommentsButton);
    commentsContainer.append(firstThread);
    setTimeout(() => commentsContainer.append(hiddenCommentsRow), 500);
    const hiddenThread = document.createElement("div");
    hiddenCommentsButton.addEventListener("click", () => {
      hiddenCommentsRow.replaceWith(hiddenThread);
    });
    const loader = new InstagramCommentThreadBatchLoader(
      support,
      scrollableContainer,
      commentsContainer,
      2,
    );

    const pendingBatch = loader.loadAndIdentifyNextBatch();
    await vi.runAllTimersAsync();
    expect((await pendingBatch).threadElements).toEqual([
      firstThread,
      hiddenThread,
    ]);
    expect((await loader.loadAndIdentifyNextBatch()).threadElements).toEqual(
      [],
    );
  });
});
