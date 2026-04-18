import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { ScrapingContentScript } from "../ScrapingContentScript";
import { SocialNetworkScraper } from "../SocialNetworkScraper";
import { PostSnapshot } from "@/shared/model/PostSnapshot";

const mocks = vi.hoisted(() => ({
  insertPostSnapshot: vi.fn<() => Promise<void>>(),
  guardActivate: vi.fn(),
  guardDeactivate: vi.fn(),
}));

vi.mock("@/shared/storage/post-snapshot-storage", () => ({
  insertPostSnapshot: mocks.insertPostSnapshot,
}));

vi.mock("../ScrapingInteractionGuard", () => ({
  ScrapingInteractionGuard: class {
    activate() {
      mocks.guardActivate();
    }
    deactivate() {
      mocks.guardDeactivate();
    }
  },
}));

function buildSnapshot(): PostSnapshot {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    postId: "post-id",
    socialNetwork: SocialNetwork.YouTube,
    url: "https://www.youtube.com/watch?v=post-id",
    publishedAt: {
      type: "absolute",
      date: "2026-01-01T00:00:00.000Z",
    },
    author: {
      name: "@channel",
      accountHref: "https://www.youtube.com/@channel",
    },
    textContent: "text",
    comments: [],
    scrapedAt: "2026-01-02T00:00:00.000Z",
    title: "title",
  };
}

function createScraper(
  scrapPagePost: SocialNetworkScraper["scrapPagePost"],
): SocialNetworkScraper {
  return {
    getSocialNetworkPageInfo: () =>
      Promise.resolve({
        isScrapablePost: true as const,
        socialNetwork: SocialNetwork.YouTube,
        postId: "post-id",
      }),
    scrapPagePost,
  };
}

describe("ScrapingContentScript", () => {
  const initialWindow = globalThis.window;

  beforeEach(() => {
    mocks.insertPostSnapshot.mockReset();
    mocks.insertPostSnapshot.mockResolvedValue();
    mocks.guardActivate.mockReset();
    mocks.guardDeactivate.mockReset();
    globalThis.window = {
      location: {
        href: "https://www.youtube.com/watch?v=post-id",
      },
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = initialWindow;
  });

  it("deactivates interaction guard after successful scraping", async () => {
    const scraper = createScraper((_, progress) => {
      progress.setProgress(10);
      progress.setProgress(100);
      return Promise.resolve(buildSnapshot());
    });
    const subject = new ScrapingContentScript(scraper);

    const result = await (
      subject as unknown as {
        scrapPost: () => Promise<{ type: string }>;
      }
    ).scrapPost();

    expect(result.type).toBe("succeeded");
    expect(mocks.guardActivate).toHaveBeenCalledOnce();
    expect(mocks.guardDeactivate).toHaveBeenCalledOnce();
    expect(mocks.insertPostSnapshot).toHaveBeenCalledOnce();
  });

  it("deactivates interaction guard when scraping fails", async () => {
    const scraper = createScraper(() => Promise.reject(new Error("boom")));
    const subject = new ScrapingContentScript(scraper);

    const result = await (
      subject as unknown as {
        scrapPost: () => Promise<{ type: string; errorMessage: string }>;
      }
    ).scrapPost();

    expect(result.type).toBe("failed");
    expect(result.errorMessage).toContain("boom");
    expect(mocks.guardActivate).toHaveBeenCalledOnce();
    expect(mocks.guardDeactivate).toHaveBeenCalledOnce();
  });

  it("deactivates interaction guard when scraping is canceled", async () => {
    const scraper = createScraper(async (abortSignal) => {
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => {
          resolve();
        });
      });
      abortSignal.throwIfAborted();
      return buildSnapshot();
    });
    const subject = new ScrapingContentScript(scraper);

    const scrapPostPromise = (
      subject as unknown as {
        scrapPost: () => Promise<{ type: string }>;
      }
    ).scrapPost();
    await Promise.resolve();
    (
      subject as unknown as {
        cancelScraping: () => void;
      }
    ).cancelScraping();

    const result = await scrapPostPromise;
    expect(result.type).toBe("canceled");
    expect(mocks.guardActivate).toHaveBeenCalledOnce();
    expect(mocks.guardDeactivate).toHaveBeenCalledOnce();
  });

  it("fails scraping when url changes during progress callback", async () => {
    const scraper = createScraper((_, progress) => {
      window.location.href = "https://www.youtube.com/watch?v=other-post";
      progress.setProgress(42);
      return Promise.resolve(buildSnapshot());
    });
    const subject = new ScrapingContentScript(scraper);

    const result = await (
      subject as unknown as {
        scrapPost: () => Promise<{ type: string; errorMessage: string }>;
      }
    ).scrapPost();

    expect(result.type).toBe("failed");
    expect(result.errorMessage).toContain(
      "Navigation detected during scraping",
    );
    expect(mocks.guardActivate).toHaveBeenCalledOnce();
    expect(mocks.guardDeactivate).toHaveBeenCalledOnce();
  });
});
