import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type * as PostSnapshotStorage from "../../post-snapshot-storage";
import type * as PostSnapshotStorageFormat from "../post-snapshot-storage-format";
import {
  COMMENT_ID,
  POST_SNAPSHOT_ID,
  REPLY_ID,
  SCREENSHOT_DATA,
  scrapingResult,
  snapshot,
} from "./post-snapshot-storage.fixtures";

describe("post snapshot storage v2", () => {
  let storage: typeof PostSnapshotStorage;
  let storageFormat: typeof PostSnapshotStorageFormat;
  let getKeysMock: ReturnType<typeof vi.fn<() => Promise<string[]>>>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    fakeBrowser.reset();
    // fakeBrowser does not implement getKeys yet.
    getKeysMock = vi.fn(async () => {
      return Object.keys(await browser.storage.local.get(null));
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    vi.spyOn(browser.storage.local, "getKeys").mockImplementation(getKeysMock);
    vi.resetModules();
    storage = await import("../../post-snapshot-storage");
    storageFormat = await import("../post-snapshot-storage-format");
    await browser.storage.local.set({
      [storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY]:
        storageFormat.POST_SNAPSHOTS_STORAGE_VERSION,
    });
  });

  async function store(result = scrapingResult()): Promise<void> {
    const session = await storage.createPostSnapshotWriteSession(
      result.postSnapshot.id,
    );
    await session.appendScreenshots(result.screenshots);
    await session.commit(result.postSnapshot);
  }

  it("stores screenshots in chunks and keeps them out of PostSnapshot", async () => {
    await store();

    const [postSnapshot] = await storage.getPostSnapshots();
    expect(postSnapshot).toEqual(snapshot());
    expect(JSON.stringify(postSnapshot)).not.toContain("screenshotData");

    await expect(
      storage.getScreenshot({
        postSnapshotId: POST_SNAPSHOT_ID,
        commentSnapshotId: COMMENT_ID,
      }),
    ).resolves.toBe(SCREENSHOT_DATA);
  });

  it("ignores screenshot references without a chunk index", async () => {
    await store();

    await expect(
      storage.getScreenshots([
        {
          postSnapshotId: POST_SNAPSHOT_ID,
          commentSnapshotId: "44444444-4444-4444-8444-444444444444",
        },
        {
          postSnapshotId: POST_SNAPSHOT_ID,
          commentSnapshotId: COMMENT_ID,
        },
      ]),
    ).resolves.toEqual(
      new Map([[`${POST_SNAPSHOT_ID}:${COMMENT_ID}`, SCREENSHOT_DATA]]),
    );
  });

  it("writes the record after its screenshot chunks", async () => {
    const setSpy = vi.spyOn(browser.storage.local, "set");

    await store();

    const writtenKeys = setSpy.mock.calls.map(
      ([value]) => Object.keys(value as Record<string, unknown>)[0],
    );
    expect(
      writtenKeys.indexOf(
        storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 0),
      ),
    ).toBeLessThan(
      writtenKeys.indexOf(
        storageFormat.postSnapshotRecordKey(POST_SNAPSHOT_ID),
      ),
    );
  });

  it("writes full screenshot chunks before the snapshot is committed", async () => {
    const session =
      await storage.createPostSnapshotWriteSession(POST_SNAPSHOT_ID);
    const oversizedScreenshot = "A".repeat(
      storageFormat.MAX_SCREENSHOT_CHUNK_BYTES,
    );

    await session.appendScreenshots({
      [COMMENT_ID]: oversizedScreenshot,
    });
    await session.appendScreenshots({ [REPLY_ID]: SCREENSHOT_DATA });

    await expect(
      browser.storage.local.get(
        storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 0),
      ),
    ).resolves.toEqual({
      [storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 0)]: {
        screenshots: { [COMMENT_ID]: oversizedScreenshot },
      },
    });
    await expect(storage.getPostSnapshots()).resolves.toEqual([]);

    await session.commit(snapshot());

    await expect(storage.getPostSnapshots()).resolves.toEqual([snapshot()]);
    await expect(
      storage.getScreenshot({
        postSnapshotId: POST_SNAPSHOT_ID,
        commentSnapshotId: REPLY_ID,
      }),
    ).resolves.toBe(SCREENSHOT_DATA);
  });

  it("keeps filling the same chunk across append calls", async () => {
    const session =
      await storage.createPostSnapshotWriteSession(POST_SNAPSHOT_ID);

    await session.appendScreenshots({ [COMMENT_ID]: SCREENSHOT_DATA });
    await session.appendScreenshots({ [REPLY_ID]: SCREENSHOT_DATA });
    await session.commit(snapshot());

    await expect(
      browser.storage.local.get(
        storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 0),
      ),
    ).resolves.toEqual({
      [storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 0)]: {
        screenshots: {
          [COMMENT_ID]: SCREENSHOT_DATA,
          [REPLY_ID]: SCREENSHOT_DATA,
        },
      },
    });
    await expect(
      browser.storage.local.get(
        storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 1),
      ),
    ).resolves.toEqual({});
  });

  it("removes chunks when a write session is aborted", async () => {
    const session =
      await storage.createPostSnapshotWriteSession(POST_SNAPSHOT_ID);
    await session.appendScreenshots({
      [COMMENT_ID]: "A".repeat(storageFormat.MAX_SCREENSHOT_CHUNK_BYTES),
    });
    await session.appendScreenshots({ [REPLY_ID]: SCREENSHOT_DATA });
    getKeysMock.mockClear();

    await session.abort();

    expect(getKeysMock).not.toHaveBeenCalled();
    await expect(
      browser.storage.local.get([
        storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 0),
        storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 1),
      ]),
    ).resolves.toEqual({});
  });

  it("deletes all snapshot records and screenshot chunks", async () => {
    await store();

    await storage.deleteAllPostSnapshots();

    await expect(storage.getPostSnapshots()).resolves.toEqual([]);
    await expect(
      storage.getScreenshot({
        postSnapshotId: POST_SNAPSHOT_ID,
        commentSnapshotId: COMMENT_ID,
      }),
    ).resolves.toBeUndefined();
    await expect(
      browser.storage.local.get(
        storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY,
      ),
    ).resolves.toEqual({
      [storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY]:
        storageFormat.POST_SNAPSHOTS_STORAGE_VERSION,
    });
  });

  it("chunks screenshots using their data length", async () => {
    const session =
      await storage.createPostSnapshotWriteSession(POST_SNAPSHOT_ID);
    const halfChunk = "A".repeat(storageFormat.MAX_SCREENSHOT_CHUNK_BYTES / 2);

    await session.appendScreenshots({
      [COMMENT_ID]: halfChunk,
      [REPLY_ID]: halfChunk,
    });
    await session.commit(snapshot());

    await expect(
      browser.storage.local.get(
        storageFormat.postSnapshotScreenshotChunkKey(POST_SNAPSHOT_ID, 1),
      ),
    ).resolves.toEqual({});
  });

  it("removes screenshot chunks without a snapshot record", async () => {
    const orphanedPostSnapshotId = "44444444-4444-4444-8444-444444444444";
    const orphanedChunkKey = storageFormat.postSnapshotScreenshotChunkKey(
      orphanedPostSnapshotId,
      0,
    );
    await storageFormat.writePostSnapshotRecord({
      postSnapshot: snapshot(),
      screenshotChunkIndexByCommentSnapshotId: {},
      screenshotChunkCount: 0,
    });
    await browser.storage.local.set({
      [orphanedChunkKey]: { screenshots: { [COMMENT_ID]: SCREENSHOT_DATA } },
    });
    const getSpy = vi.spyOn(browser.storage.local, "get");

    await storage.initializeStorage();

    expect(JSON.stringify(getSpy.mock.calls)).not.toContain(
      storageFormat.postSnapshotRecordKey(POST_SNAPSHOT_ID),
    );
    await expect(browser.storage.local.get(orphanedChunkKey)).resolves.toEqual(
      {},
    );
  });

  it("rejects a screenshot that does not belong to the snapshot", async () => {
    const result = scrapingResult();
    result.screenshots["44444444-4444-4444-8444-444444444444"] =
      SCREENSHOT_DATA;

    await expect(store(result)).rejects.toThrow(
      "does not belong to PostSnapshot",
    );
  });

  it("does not read chunks when listing snapshots", async () => {
    await store();
    const getSpy = vi.spyOn(browser.storage.local, "get");

    await storage.getPostSnapshots();

    expect(JSON.stringify(getSpy.mock.calls)).not.toContain(
      "post-snapshots:v2:screenshot-chunk:",
    );
  });

  it("waits for migration to publish storage version 2", async () => {
    await browser.storage.local.remove(
      storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY,
    );
    getKeysMock.mockClear();

    const snapshotsPromise = storage.getPostSnapshots();
    expect(getKeysMock).not.toHaveBeenCalled();

    await browser.storage.local.set({
      [storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY]:
        storageFormat.POST_SNAPSHOTS_STORAGE_VERSION,
    });

    await expect(snapshotsPromise).resolves.toEqual([]);
    expect(getKeysMock).toHaveBeenCalledOnce();
  });

  it("updates snapshot metadata without changing screenshot chunks", async () => {
    await store();
    const chunkKey = storageFormat.postSnapshotScreenshotChunkKey(
      POST_SNAPSHOT_ID,
      0,
    );
    const chunkBeforeUpdate = await browser.storage.local.get(chunkKey);
    const updatedSnapshot = {
      ...snapshot(),
      classificationJobId: "classification-job",
      classificationStatus: "SUBMITTED" as const,
    };

    await storage.updatePostSnapshot(updatedSnapshot);

    await expect(browser.storage.local.get(chunkKey)).resolves.toEqual(
      chunkBeforeUpdate,
    );
    await expect(
      storage.getPostSnapshotById(POST_SNAPSHOT_ID),
    ).resolves.toEqual(updatedSnapshot);
  });

  it("rejects an unknown storage version", async () => {
    await browser.storage.local.set({
      [storageFormat.POST_SNAPSHOTS_STORAGE_VERSION_KEY]: 3,
    });

    await expect(storage.getPostSnapshots()).rejects.toThrow(
      "Unsupported post snapshot storage version: 3",
    );
  });
});
