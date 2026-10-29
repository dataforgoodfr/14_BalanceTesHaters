// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Image } from "image-js";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { InstagramComment } from "../InstagramLoadedCommentScraper";
import { InstagramLoadedCommentScraper } from "../InstagramLoadedCommentScraper";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const dummyScreenshotImage = new Image(5, 5);

function loadCommentElement(fixtureName: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = readFileSync(
    resolve(currentDirectory, fixtureName),
    "utf-8",
  );
  return wrapper.firstElementChild as HTMLElement;
}

function scrapComment(commentElement: HTMLElement): Promise<InstagramComment> {
  return Promise.resolve(
    new InstagramLoadedCommentScraper(
      commentElement,
      dummyScreenshotImage,
      new ScrapingSupport(new AbortController().signal),
    ).scrapLoadedComment(),
  );
}

function expectTextComment(result: InstagramComment): void {
  expect(result).toMatchObject({
    type: "text",
    data: {
      author: {
        accountHref: "https://www.instagram.com/argo82/",
        name: "argo82",
      },
      commentId: "18130803337767799",
      nbLikes: 2,
      publishedAt: {
        date: "2026-10-23T17:05:10.000Z",
        type: "absolute",
      },
    },
  });
  expect(result.type).toBe("text");
  if (result.type === "text") {
    expect(result.data.textContent.replaceAll(/\s+/g, " ")).toBe(
      "Macron c’est le retour de Giscard… 😆",
    );
  }
}

describe("InstagramLoadedCommentScraper", () => {
  beforeAll(() => {
    document.location.assign("https://www.instagram.com/");
  });

  it("scrapes a comment from the unauthenticated DOM", async () => {
    const result = await scrapComment(
      loadCommentElement("comment-unauthenticated.html"),
    );

    expectTextComment(result);
  });

  it("scrapes a comment through the additional authenticated DOM wrapper", async () => {
    const result = await scrapComment(
      loadCommentElement("comment-authenticated.html"),
    );

    expectTextComment(result);
  });

  it("scrapes an image comment", async () => {
    const result = await scrapComment(loadCommentElement("comment-image.html"));

    expect(result).toMatchObject({ type: "image" });
  });

  it("identifies a Facebook comments placeholder", async () => {
    const result = await scrapComment(
      loadCommentElement("comment-facebook-placeholder.html"),
    );

    expect(result).toEqual({ type: "fb-comments", data: undefined });
  });
});
