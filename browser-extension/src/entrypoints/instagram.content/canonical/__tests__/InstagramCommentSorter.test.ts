// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { InstagramCommentSorter } from "../InstagramCommentSorter";

describe("InstagramCommentSorter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    ["Pour vous", "Les plus récents"],
    ["For you", "Most recent"],
  ])(
    "selects most recent from %s and waits for comment content to refresh even when rows are reused",
    async (initialLabel, recentLabel) => {
      document.body.innerHTML = `<main><hr/><div><div>
      <div><div role="button" aria-haspopup="menu">${initialLabel}</div></div>
      <div id="comments"><div aria-hidden="true"><img/></div><div id="old"><time></time></div></div>
    </div></div></main>`;
      const control = document.querySelector<HTMLElement>(
        "[aria-haspopup='menu']",
      )!;
      const old = document.querySelector("#old")!;
      const oldTime = old.firstElementChild!;
      const menu = document.createElement("div");
      menu.setAttribute("role", "dialog");
      menu.innerHTML = `<div role="button">${initialLabel}</div><div role="button">${recentLabel}</div>`;
      control.addEventListener("click", () => {
        document.body.append(menu);
      });
      const option = menu.lastElementChild!;
      const click = vi.fn(() => {
        control.innerText = recentLabel;
        menu.remove();
        setTimeout(() => {
          old.replaceChildren(document.createElement("time"));
        }, 2_000);
      });
      option.addEventListener("click", click);
      let finished = false;
      const pending = new InstagramCommentSorter(
        new ScrapingSupport(new AbortController().signal),
      )
        .sortByMostRecent()
        .then(() => {
          finished = true;
        });

      await vi.advanceTimersByTimeAsync(1_000);
      expect(control.innerText).toBe(recentLabel);
      expect(finished).toBe(false);
      await vi.runAllTimersAsync();
      await pending;

      expect(click).toHaveBeenCalledOnce();
      expect(old.isConnected).toBe(true);
      expect(oldTime.isConnected).toBe(false);
      expect(finished).toBe(true);
    },
  );

  it("leaves already selected most-recent sorting unchanged", async () => {
    document.body.innerHTML =
      '<main><hr/><div><div role="button" aria-haspopup="menu">Most recent</div></div></main>';
    const click = vi.fn();
    document.querySelector("[aria-haspopup]")!.addEventListener("click", click);
    await new InstagramCommentSorter(
      new ScrapingSupport(new AbortController().signal),
    ).sortByMostRecent();
    expect(click).not.toHaveBeenCalled();
  });

  it("continues without changing unrelated menus when the comment sort control is absent", async () => {
    document.body.innerHTML =
      '<main><div role="button" aria-haspopup="menu">For you</div></main>';
    const click = vi.fn();
    document.querySelector("[aria-haspopup]")!.addEventListener("click", click);
    const pending = new InstagramCommentSorter(
      new ScrapingSupport(new AbortController().signal),
    ).sortByMostRecent();
    await vi.runAllTimersAsync();
    await pending;
    expect(click).not.toHaveBeenCalled();
  });

  it("does not start scraping when the sort label changes but old rows remain", async () => {
    document.body.innerHTML =
      '<main><hr/><div><div><div><div role="button" aria-haspopup="menu">For you</div></div><div><div><time></time></div></div></div></div></main>';
    const control = document.querySelector<HTMLElement>("[aria-haspopup]")!;
    control.addEventListener("click", () => {
      const menu = document.createElement("div");
      menu.setAttribute("role", "menu");
      menu.innerHTML = '<div role="menuitem">Most recent</div>';
      menu.firstElementChild!.addEventListener("click", () => {
        control.innerText = "Most recent";
        menu.remove();
      });
      document.body.append(menu);
    });
    const outcome = new InstagramCommentSorter(
      new ScrapingSupport(new AbortController().signal),
    )
      .sortByMostRecent()
      .catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    expect(await outcome).toBeInstanceOf(Error);
    expect(await outcome).toHaveProperty(
      "message",
      expect.stringContaining("mostRecentCommentsSortControl"),
    );
  });
});
