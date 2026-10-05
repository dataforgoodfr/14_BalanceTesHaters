import {
  LegacyPostSnapshotSchema,
  type LegacyCommentSnapshot,
  type LegacyPostSnapshot,
} from "./LegacyPostSnapshotSchema";
import {
  POST_SNAPSHOTS_STORAGE_VERSION,
  POST_SNAPSHOTS_STORAGE_VERSION_KEY,
  readPostSnapshotRecord,
  readPostSnapshotStorageVersion,
  unsupportedStorageVersionError,
} from "../post-snapshot-storage-format";
import { StoragePostSnapshotWriteSession } from "../post-snapshot-write-session";
import type { ScrapingScreenshots } from "@/shared/model/scraping/ScrapingScreenshots";
import type {
  CommentSnapshot,
  PostSnapshot,
} from "@/shared/model/PostSnapshot";

export async function migrateLegacyPostSnapshotStorage(): Promise<void> {
  const versionValue = await readPostSnapshotStorageVersion();
  if (versionValue === POST_SNAPSHOTS_STORAGE_VERSION) {
    await browser.storage.local.remove(LEGACY_POST_SNAPSHOTS_KEY);
    return;
  }
  if (versionValue !== undefined) {
    throw unsupportedStorageVersionError(versionValue);
  }

  const legacyValue = (
    await browser.storage.local.get(LEGACY_POST_SNAPSHOTS_KEY)
  )[LEGACY_POST_SNAPSHOTS_KEY];
  if (legacyValue !== undefined) {
    const legacySnapshots = LegacyPostSnapshotSchema.array().parse(legacyValue);
    for (const legacySnapshot of legacySnapshots) {
      if (await readPostSnapshotRecord(legacySnapshot.id)) {
        continue;
      }
      const { postSnapshot, screenshots } =
        detachLegacyScreenshots(legacySnapshot);
      const writeSession = new StoragePostSnapshotWriteSession(postSnapshot.id);
      await writeSession.appendScreenshots(screenshots);
      await writeSession.commit(postSnapshot);
    }
  }
  await browser.storage.local.set({
    [POST_SNAPSHOTS_STORAGE_VERSION_KEY]: POST_SNAPSHOTS_STORAGE_VERSION,
  });
  await browser.storage.local.remove(LEGACY_POST_SNAPSHOTS_KEY);
}
export const LEGACY_POST_SNAPSHOTS_KEY = "posts";
export function detachLegacyScreenshots(legacySnapshot: LegacyPostSnapshot): {
  postSnapshot: PostSnapshot;
  screenshots: ScrapingScreenshots;
} {
  const screenshots: ScrapingScreenshots = {};
  const detach = (comment: LegacyCommentSnapshot): CommentSnapshot => {
    const { screenshotData, replies, ...snapshot } = comment;
    if (screenshotData) {
      screenshots[comment.id] = screenshotData;
    }
    return { ...snapshot, replies: replies.map(detach) };
  };
  return {
    postSnapshot: {
      ...legacySnapshot,
      comments: legacySnapshot.comments.map(detach),
    },
    screenshots,
  };
}
