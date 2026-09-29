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

  it("stores screenshots in chunks and keeps them out of PostSnapshot", async () => {
    await storage.insertPostSnapshot(scrapingResult());

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
    await storage.insertPostSnapshot(scrapingResult());

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

    await storage.insertPostSnapshot(scrapingResult());

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

  it("rejects a screenshot that does not belong to the snapshot", async () => {
    const result = scrapingResult();
    result.screenshots["44444444-4444-4444-8444-444444444444"] =
      SCREENSHOT_DATA;

    await expect(storage.insertPostSnapshot(result)).rejects.toThrow(
      "does not belong to PostSnapshot",
    );
  });

  it("does not read chunks when listing snapshots", async () => {
    await storage.insertPostSnapshot(scrapingResult());
    const getSpy = vi.spyOn(browser.storage.local, "get");

    await storage.getPostSnapshots();

    expect(JSON.stringify(getSpy.mock.calls)).not.toContain(
      "post-snapshots:v2:screenshot-chunk:",
    );
  });

  it("keeps a screenshot larger than the target size in one chunk", () => {
    const oversizedScreenshot = "A".repeat(
      storageFormat.MAX_SCREENSHOT_CHUNK_BYTES,
    );

    const result = storageFormat.buildScreenshotChunks({
      [COMMENT_ID]: oversizedScreenshot,
      [REPLY_ID]: SCREENSHOT_DATA,
    });

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]!.screenshots).toEqual({
      [COMMENT_ID]: oversizedScreenshot,
    });
    expect(result.chunkIndexByCommentSnapshotId).toEqual({
      [COMMENT_ID]: 0,
      [REPLY_ID]: 1,
    });
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
    await storage.insertPostSnapshot(scrapingResult());
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
