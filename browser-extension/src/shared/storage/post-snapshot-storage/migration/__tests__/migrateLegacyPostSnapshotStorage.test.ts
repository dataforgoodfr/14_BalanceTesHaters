import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  COMMENT_ID,
  POST_SNAPSHOT_ID,
  REPLY_ID,
  REPLY_SCREENSHOT_DATA,
  SCREENSHOT_DATA,
  snapshot,
} from "../../__tests__/post-snapshot-storage.fixtures";
import type { LegacyPostSnapshot } from "../LegacyPostSnapshotSchema";
import type * as PostSnapshotStorage from "../..";
import type * as PostSnapshotStorageFormat from "../../post-snapshot-storage-format";
import type * as LegacyMigration from "../migrateLegacyPostSnapshotStorage";

describe("legacy post snapshot storage migration", () => {
  let storage: typeof PostSnapshotStorage;
  let storageFormat: typeof PostSnapshotStorageFormat;
  let migration: typeof LegacyMigration;

  beforeEach(async () => {
    vi.restoreAllMocks();
    fakeBrowser.reset();
    // fakeBrowser does not implement getKeys yet.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    vi.spyOn(browser.storage.local, "getKeys").mockImplementation(async () => {
      return Object.keys(await browser.storage.local.get(null));
    });
    vi.resetModules();
    storage = await import("../..");
    storageFormat = await import("../../post-snapshot-storage-format");
    migration = await import("../migrateLegacyPostSnapshotStorage");
  });

  it("moves nested screenshots to v2 chunks and removes legacy storage", async () => {
    await browser.storage.local.set({ posts: [legacySnapshot()] });

    await migration.migrateLegacyPostSnapshotStorage();

    await expect(
      storage.getPostSnapshotById(POST_SNAPSHOT_ID),
    ).resolves.toEqual(snapshot());
    await expect(
      storage.getScreenshots([
        {
          postSnapshotId: POST_SNAPSHOT_ID,
          commentSnapshotId: COMMENT_ID,
        },
        {
          postSnapshotId: POST_SNAPSHOT_ID,
          commentSnapshotId: REPLY_ID,
        },
      ]),
    ).resolves.toEqual(
      new Map([
        [`${POST_SNAPSHOT_ID}:${COMMENT_ID}`, SCREENSHOT_DATA],
        [`${POST_SNAPSHOT_ID}:${REPLY_ID}`, REPLY_SCREENSHOT_DATA],
      ]),
    );
    await expect(browser.storage.local.get("posts")).resolves.toEqual({});
    await expect(
      browser.storage.local.get(
        storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY,
      ),
    ).resolves.toEqual({
      [storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY]:
        storageFormat.POST_SNAPSHOTS_STORAGE_VERSION,
    });
  });

  it("keeps an existing committed record when migration restarts", async () => {
    const existingScreenshot = "bmV3ZXI=";
    await browser.storage.local.set({
      posts: [legacySnapshot()],
      [storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 0)]: {
        screenshots: { [COMMENT_ID]: existingScreenshot },
      },
      [storageFormat.postSnapshotRecordKey(POST_SNAPSHOT_ID)]: {
        postSnapshot: snapshot(),
        screenshotChunkIndexByCommentSnapshotId: { [COMMENT_ID]: 0 },
        screenshotChunkCount: 1,
      },
    });

    await migration.migrateLegacyPostSnapshotStorage();

    await expect(
      storage.getScreenshot({
        postSnapshotId: POST_SNAPSHOT_ID,
        commentSnapshotId: COMMENT_ID,
      }),
    ).resolves.toBe(existingScreenshot);
  });

  it("rejects an unknown storage version", async () => {
    await browser.storage.local.set({
      [storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY]: 3,
    });

    await expect(migration.migrateLegacyPostSnapshotStorage()).rejects.toThrow(
      "Unsupported post snapshot storage version: 3",
    );
  });
});

function legacySnapshot(): LegacyPostSnapshot {
  const postSnapshot = snapshot();
  const comment = postSnapshot.comments[0]!;
  const reply = comment.replies[0]!;
  return {
    ...postSnapshot,
    comments: [
      {
        ...comment,
        screenshotData: SCREENSHOT_DATA,
        replies: [
          {
            ...reply,
            screenshotData: REPLY_SCREENSHOT_DATA,
            replies: [],
          },
        ],
      },
    ],
  };
}
