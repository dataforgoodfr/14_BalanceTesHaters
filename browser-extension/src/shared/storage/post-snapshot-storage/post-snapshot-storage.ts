import type { CommentScreenshotRef } from "../../model/CommentScreenshot";
import { commentScreenshotRefKey } from "../../model/CommentScreenshot";
import { isRunningClassificationStatus } from "../../model/ClassificationStatus";
import type { CommentSnapshot, PostSnapshot } from "../../model/PostSnapshot";
import { PostSnapshotSchema } from "../../model/PostSnapshot";
import type { PostScrapingResult } from "../../model/PostScrapingResult";
import type { SocialNetworkName } from "../../model/SocialNetworkName";
import {
  isPostPublishedAfter,
  isPostPublishedBefore,
} from "../../utils/post-util";
import { createLogger } from "../../utils/createLogger";
import { migrateLegacyPostSnapshotStorage } from "./migration/migrateLegacyPostSnapshotStorage";
import {
  getPostSnapshotDataKeys,
  getPostSnapshotStorageKeys,
  POST_SNAPSHOTS_STORAGE_VERSION,
  POST_SNAPSHOTS_STORAGE_VERSION_KEY,
  type PostSnapshotRecord,
  postSnapshotRecordKey,
  postSnapshotScreenshotChunkKey,
  readPostSnapshotRecord,
  readPostSnapshotRecords,
  readPostSnapshotStorageVersion,
  ScreenshotDataByCommentSnapshotIdSchema,
  StoredScreenshotChunkSchema,
  unsupportedStorageVersionError,
  writePostSnapshot,
  writePostSnapshotRecord,
} from "./post-snapshot-storage-format";

const logger = createLogger("post-snapshot-storage");

let migrationPromise: Promise<void> | undefined;
let storageReadyPromise: Promise<void> | undefined;

export function initializeStorage(): Promise<void> {
  migrationPromise ??= migrateLegacyPostSnapshotStorage();
  return migrationPromise;
}

export async function getPostSnapshotsBytesInUse(): Promise<number> {
  await ensurePostSnapshotStorageReady();
  return browser.storage.local.getBytesInUse(
    await getPostSnapshotStorageKeys(),
  );
}

export async function updatePostSnapshot(postSnapshot: PostSnapshot) {
  PostSnapshotSchema.parse(postSnapshot);
  await ensurePostSnapshotStorageReady();
  const record = await readPostSnapshotRecord(postSnapshot.id);
  if (!record) {
    throw new Error(
      "Cannot find an existing PostSnapshot with id: " + postSnapshot.id,
    );
  }
  await writePostSnapshotRecord({
    ...record,
    postSnapshot,
  });
}

export async function insertPostSnapshot(result: PostScrapingResult) {
  PostSnapshotSchema.parse(result.postSnapshot);
  ScreenshotDataByCommentSnapshotIdSchema.parse(result.screenshots);
  assertScreenshotsBelongToSnapshot(result);
  await ensurePostSnapshotStorageReady();
  if (await readPostSnapshotRecord(result.postSnapshot.id)) {
    throw new Error("Post already exists with id: " + result.postSnapshot.id);
  }
  await writePostSnapshot(result);
}

export async function deleteAllPostSnapshots() {
  await ensurePostSnapshotStorageReady();
  const keys = await getPostSnapshotDataKeys();
  if (keys.length > 0) {
    await browser.storage.local.remove(keys);
  }
}

export async function deletePostSnapshot(postSnapshotId: string) {
  await ensurePostSnapshotStorageReady();
  const record = await readPostSnapshotRecord(postSnapshotId);
  if (!record) {
    throw new Error(
      "Cannot find an existing PostSnapshot with id: " + postSnapshotId,
    );
  }
  await browser.storage.local.remove(postSnapshotRecordKey(postSnapshotId));
  const chunkKeys = Array.from(
    { length: record.screenshotChunkCount },
    (_, i) => postSnapshotScreenshotChunkKey(postSnapshotId, i),
  );
  if (chunkKeys.length > 0) {
    await browser.storage.local.remove(chunkKeys);
  }
}

export async function deletePost(
  postsToDelete: Array<{ socialNetwork: SocialNetworkName; postId: string }>,
) {
  if (postsToDelete.length === 0) {
    return;
  }
  const records = await getPostSnapshotRecords();
  const deleteKeys = new Set(
    postsToDelete.map((post) => `${post.socialNetwork}-${post.postId}`),
  );
  const matchingRecords = records.filter(({ postSnapshot }) =>
    deleteKeys.has(`${postSnapshot.socialNetwork}-${postSnapshot.postId}`),
  );
  if (matchingRecords.length === 0) {
    throw new Error(
      `Cannot find any matching posts to delete for the provided list: ${[...deleteKeys].join(", ")}`,
    );
  }
  for (const { postSnapshot } of matchingRecords) {
    await deletePostSnapshot(postSnapshot.id);
  }
}

export async function getPostSnapshotRecords(): Promise<PostSnapshotRecord[]> {
  await ensurePostSnapshotStorageReady();
  return readPostSnapshotRecords();
}

export async function getPostSnapshots(): Promise<PostSnapshot[]> {
  return (await getPostSnapshotRecords()).map((record) => record.postSnapshot);
}

export async function getPostSnapshotRecordsBySocialNetworkAndPeriod(
  socialNetworkFilter: string[] = [],
  from?: Date,
  to?: Date,
): Promise<PostSnapshotRecord[]> {
  let records = await getPostSnapshotRecords();
  if (socialNetworkFilter.length > 0) {
    records = records.filter(({ postSnapshot }) =>
      socialNetworkFilter.includes(postSnapshot.socialNetwork),
    );
  }
  if (from) {
    records = records.filter(({ postSnapshot }) =>
      isPostPublishedAfter(postSnapshot, from),
    );
  }
  if (to) {
    records = records.filter(({ postSnapshot }) =>
      isPostPublishedBefore(postSnapshot, to),
    );
  }
  return records;
}

export async function getPostSnapshotRecordsByPostIdList(
  postIdList: string[],
): Promise<PostSnapshotRecord[]> {
  return (await getPostSnapshotRecords()).filter(({ postSnapshot }) =>
    postIdList.includes(postSnapshot.postId),
  );
}

export async function getPostSnapshotRecordsForPostId(
  socialNetwork: SocialNetworkName,
  postId: string,
): Promise<PostSnapshotRecord[]> {
  return (await getPostSnapshotRecords()).filter(
    ({ postSnapshot }) =>
      postSnapshot.socialNetwork === socialNetwork &&
      postSnapshot.postId === postId,
  );
}

export async function getPostSnapshotsForPostId(
  socialNetwork: SocialNetworkName,
  postId: string,
): Promise<PostSnapshot[]> {
  return (await getPostSnapshotRecordsForPostId(socialNetwork, postId)).map(
    (record) => record.postSnapshot,
  );
}

export async function getPostSnapshotById(
  postSnapshotId: string,
): Promise<PostSnapshot | undefined> {
  await ensurePostSnapshotStorageReady();
  return (await readPostSnapshotRecord(postSnapshotId))?.postSnapshot;
}

export async function getPostSnapshotsPendingSubmission(): Promise<
  PostSnapshot[]
> {
  return (await getPostSnapshots()).filter((post) => !post.classificationJobId);
}

export async function getPostSnapshotsPendingResults(): Promise<
  PostSnapshot[]
> {
  return (await getPostSnapshots()).filter((post) => {
    if (!post.classificationJobId) {
      return false;
    }
    return (
      !post.classificationStatus ||
      isRunningClassificationStatus(post.classificationStatus)
    );
  });
}

export async function getScreenshot(
  ref: CommentScreenshotRef,
): Promise<string | undefined> {
  return (await getScreenshots([ref])).get(commentScreenshotRefKey(ref));
}

export async function getScreenshots(
  refs: CommentScreenshotRef[],
): Promise<ReadonlyMap<string, string>> {
  await ensurePostSnapshotStorageReady();
  const uniqueRefs = new Map(
    refs.map((ref) => [commentScreenshotRefKey(ref), ref]),
  );
  const refsBySnapshot = Map.groupBy(
    uniqueRefs.values(),
    (ref) => ref.postSnapshotId,
  );
  const loadedCommentScreenshots = new Map<string, string>();

  for (const [postSnapshotId, snapshotRefs] of refsBySnapshot) {
    const record = await readPostSnapshotRecord(postSnapshotId);
    if (!record) {
      continue;
    }
    const refsWithChunkIndex = snapshotRefs.flatMap((ref) => {
      const chunkIndex =
        record.screenshotChunkIndexByCommentSnapshotId[ref.commentSnapshotId];
      return chunkIndex === undefined ? [] : [{ ref, chunkIndex }];
    });
    const refsByChunk = Map.groupBy(
      refsWithChunkIndex,
      ({ chunkIndex }) => chunkIndex,
    );
    const chunkIndexes = [...refsByChunk.keys()];
    const chunkKeys = chunkIndexes.map((index) =>
      postSnapshotScreenshotChunkKey(postSnapshotId, index),
    );
    const storedChunks = await browser.storage.local.get(chunkKeys);
    for (const chunkIndex of chunkIndexes) {
      const chunkKey = postSnapshotScreenshotChunkKey(
        postSnapshotId,
        chunkIndex,
      );
      const chunkResult = StoredScreenshotChunkSchema.safeParse(
        storedChunks[chunkKey],
      );
      if (!chunkResult.success) {
        logger.warn("Ignoring invalid screenshot chunk", chunkKey);
        continue;
      }
      for (const { ref } of refsByChunk.get(chunkIndex) ?? []) {
        const data = chunkResult.data.screenshots[ref.commentSnapshotId];
        if (data) {
          loadedCommentScreenshots.set(commentScreenshotRefKey(ref), data);
        }
      }
    }
  }

  return loadedCommentScreenshots;
}

async function ensurePostSnapshotStorageReady(): Promise<void> {
  if (migrationPromise) {
    return migrationPromise;
  }
  storageReadyPromise ??= waitForPostSnapshotStorageVersion();
  return storageReadyPromise;
}

function waitForPostSnapshotStorageVersion(): Promise<void> {
  return new Promise((resolve, reject) => {
    const stopWaiting = () => {
      browser.storage.onChanged.removeListener(onStorageChanged);
    };
    const checkVersion = (version: unknown) => {
      if (version === POST_SNAPSHOTS_STORAGE_VERSION) {
        stopWaiting();
        resolve();
      } else if (version !== undefined) {
        stopWaiting();
        reject(unsupportedStorageVersionError(version));
      }
    };
    const onStorageChanged = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (
        areaName === "local" &&
        POST_SNAPSHOTS_STORAGE_VERSION_KEY in changes
      ) {
        checkVersion(changes[POST_SNAPSHOTS_STORAGE_VERSION_KEY]?.newValue);
      }
    };

    browser.storage.onChanged.addListener(onStorageChanged);
    void readPostSnapshotStorageVersion().then(
      checkVersion,
      (error: unknown) => {
        stopWaiting();
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function assertScreenshotsBelongToSnapshot({
  postSnapshot,
  screenshots,
}: PostScrapingResult): void {
  const commentSnapshotIds = new Set<string>();
  const visit = (comments: CommentSnapshot[]) => {
    for (const comment of comments) {
      commentSnapshotIds.add(comment.id);
      visit(comment.replies);
    }
  };
  visit(postSnapshot.comments);

  const unknownScreenshotId = Object.keys(screenshots).find(
    (id) => !commentSnapshotIds.has(id),
  );
  if (unknownScreenshotId) {
    throw new Error(
      `Screenshot ${unknownScreenshotId} does not belong to PostSnapshot ${postSnapshot.id}`,
    );
  }
}
