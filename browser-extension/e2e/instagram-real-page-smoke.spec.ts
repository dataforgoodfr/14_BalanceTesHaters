import { withRetry } from "@/shared/utils/withRetry";
import { test, expect } from "./fixtures";
import { evaluateInBackgroundWorker } from "./utils/evaluateInBackgroundWorker";
import { findTabIdForUrl } from "./utils/findTabIdForUrl";
import { BrowserContext, Page } from "@playwright/test";
import {
  CommentSnapshot,
  PostSnapshotSchema,
} from "@/shared/model/PostSnapshot";

const DEFAULT_INSTAGRAM_REAL_POST_URLS = [
  "https://www.instagram.com/p/C56ZonItOfO/",
  "https://www.instagram.com/p/DRTE4OmAvUN/",
];

test.describe("Instagram real page smoke", () => {
  test("Scraping starts on a real Instagram post URL", async ({ context }) => {
    test.setTimeout(6 * 60_000);

    const candidatePostUrls = resolveInstagramRealPostUrls();
    const maxAttempts = readPositiveIntEnv("INSTAGRAM_REAL_SMOKE_ATTEMPTS", 4);

    await withRetry({
      maxAttempts,
      beforeRetry: ({
        latestError,
        failedAttempts,
        remainingAttempts,
      }) => {
        console.warn(
          `[E2E][Instagram real smoke] Attempt ${failedAttempts} failed. Remaining: ${remainingAttempts}`,
          latestError,
        );
      },
      retry: async () => {
        const selected = await openFirstScrapableInstagramPost(
          context,
          candidatePostUrls,
        );
        try {
          const scrapeResult = await evaluateInBackgroundWorker<unknown>(
            context,
            (tabId: number) => {
              return browser.tabs.sendMessage(tabId, {
                msgType: "scs-scrap-tab",
              });
            },
            selected.tabId,
          );

          if (!isScrapeSucceeded(scrapeResult)) {
            throw new Error(
              `Unexpected scraping result: ${JSON.stringify(scrapeResult)}`,
            );
          }

          const storedPost = await waitForStoredPostSnapshot(
            context,
            scrapeResult.postSnapshotId,
            30_000,
          );
          const allComments = flattenComments(storedPost.comments);

          expect(allComments.length).toBeGreaterThan(1);
          const commentsWithEmptyText = allComments.filter(
            (comment) => comment.textContent.trim().length === 0,
          );
          expect(commentsWithEmptyText).toHaveLength(0);
        } finally {
          await selected.page.close().catch(() => undefined);
        }
      },
    });
  });
});

async function openFirstScrapableInstagramPost(
  context: BrowserContext,
  candidatePostUrls: string[],
): Promise<{ page: Page; tabId: number; resolvedUrl: string }> {
  const failureReasons: string[] = [];

  for (const postUrl of candidatePostUrls) {
    const page = await context.newPage();
    try {
      await page.goto(postUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await page.waitForTimeout(1000);

      const resolvedUrl = page.url();
      if (isInstagramLoginUrl(resolvedUrl)) {
        failureReasons.push(`${postUrl}: redirected to login (${resolvedUrl})`);
        await page.close();
        continue;
      }

      const tabId =
        (await findTabIdForUrl(context, resolvedUrl)) ??
        (await findTabIdForUrl(context, postUrl));
      if (!tabId) {
        failureReasons.push(`${postUrl}: could not resolve tabId`);
        await page.close();
        continue;
      }

      await evaluateInBackgroundWorker(
        context,
        async (tabId: number) => {
          await browser.scripting.executeScript({
            target: { tabId },
            files: ["content-scripts/instagram.js"],
          });
        },
        tabId,
      );

      const pageInfo = await evaluateInBackgroundWorker<unknown>(
        context,
        (tabId: number) => {
          return browser.tabs.sendMessage(tabId, {
            msgType: "scs-get-page-info",
          });
        },
        tabId,
      );
      if (!isScrapablePageInfo(pageInfo) || !pageInfo.isScrapablePost) {
        failureReasons.push(
          `${postUrl}: page is not scrapable (${resolvedUrl})`,
        );
        await page.close();
        continue;
      }

      return { page, tabId, resolvedUrl };
    } catch (error) {
      failureReasons.push(`${postUrl}: ${String(error)}`);
      await page.close().catch(() => undefined);
    }
  }

  throw new Error(
    `No real Instagram candidate URL was scrapable. Reasons:\n${failureReasons.join("\n")}`,
  );
}

function resolveInstagramRealPostUrls(): string[] {
  const envValue = process.env.INSTAGRAM_REAL_POST_URLS;
  if (!envValue) {
    return DEFAULT_INSTAGRAM_REAL_POST_URLS;
  }

  const urls = envValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (urls.length === 0) {
    throw new Error(
      "INSTAGRAM_REAL_POST_URLS must contain at least one comma-separated URL",
    );
  }
  return urls;
}

function isInstagramLoginUrl(url: string): boolean {
  const parsed = URL.parse(url);
  return (
    parsed?.hostname === "www.instagram.com" &&
    parsed.pathname.startsWith("/accounts/login")
  );
}

function readPositiveIntEnv(name: string, fallbackValue: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallbackValue;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected ${name} to be a positive integer`);
  }
  return parsed;
}

function isScrapeSucceeded(
  scrapeResult: unknown,
): scrapeResult is { type: "succeeded"; postSnapshotId: string } {
  return (
    typeof scrapeResult === "object" &&
    scrapeResult !== null &&
    "type" in scrapeResult &&
    scrapeResult.type === "succeeded" &&
    "postSnapshotId" in scrapeResult &&
    typeof scrapeResult.postSnapshotId === "string"
  );
}

function isScrapablePageInfo(
  pageInfo: unknown,
): pageInfo is { isScrapablePost: boolean } {
  return (
    typeof pageInfo === "object" &&
    pageInfo !== null &&
    "isScrapablePost" in pageInfo &&
    typeof pageInfo.isScrapablePost === "boolean"
  );
}

async function waitForStoredPostSnapshot(
  context: BrowserContext,
  postSnapshotId: string,
  timeoutMs: number,
) {
  const startedAt = Date.now();
  for (;;) {
    const postSnapshots = await readAllStoredPostSnapshots(context);
    const matching = postSnapshots.find((post) => post.id === postSnapshotId);
    if (matching) {
      return matching;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timeout waiting for postSnapshotId=${postSnapshotId} in browser.storage.local`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function readAllStoredPostSnapshots(context: BrowserContext) {
  const posts: unknown = await evaluateInBackgroundWorker(context, async () => {
    const partial = await browser.storage.local.get("posts");
    return partial["posts"] || [];
  });
  return PostSnapshotSchema.array().parse(posts);
}

function flattenComments(comments: CommentSnapshot[]): CommentSnapshot[] {
  return comments.flatMap((comment) => [
    comment,
    ...flattenComments(comment.replies),
  ]);
}
