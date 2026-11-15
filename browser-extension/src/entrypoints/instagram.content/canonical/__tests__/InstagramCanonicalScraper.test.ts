// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { PostSnapshotSchema } from "@/shared/model/PostSnapshot";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { InstagramCanonicalScraper } from "../InstagramCanonicalScraper";

afterEach(() => vi.restoreAllMocks());

it("attaches scraping settings and elapsed time to a validated snapshot", async () => {
  document.head.innerHTML =
    '<meta property="og:description" content="author on November 15, 2026">';
  document.body.innerHTML = `
    <div>
      <span><button><div><svg aria-label="Comment"></svg></div></button></span>
      <span></span><span></span><span>0</span>
    </div>`;
  vi.spyOn(performance, "now").mockReturnValueOnce(1000).mockReturnValue(1250);
  const snapshot = await new InstagramCanonicalScraper(
    new ScrapingSupport(new AbortController().signal),
    {
      url: "https://www.instagram.com/p/post/",
      isScrapablePost: true,
      socialNetwork: SocialNetwork.Instagram,
      postId: "post",
    },
    new ProgressManager(vi.fn()),
    { postSnapshotId: crypto.randomUUID(), appendScreenshots: vi.fn() },
    true,
    10,
  ).scrapPost();
  expect(PostSnapshotSchema.parse(snapshot).scrapingMetadata).toEqual({
    expectedCommentsCount: 0,
    commentsLimit: 10,
    limitReached: false,
    filteredCommentsCount: 0,
    durationMs: 250,
    screenshotsEnabled: false,
  });
});
