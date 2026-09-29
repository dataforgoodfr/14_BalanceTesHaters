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
  writePostSnapshot,
} from "../post-snapshot-storage-format";
import type { PostScrapingResult } from "@/shared/model/PostScrapingResult";
import type { CommentSnapshot } from "@/shared/model/PostSnapshot";

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
      await writePostSnapshot(detachLegacyScreenshots(legacySnapshot));
    }
  }
  await browser.storage.local.set({
    [POST_SNAPSHOTS_STORAGE_VERSION_KEY]: POST_SNAPSHOTS_STORAGE_VERSION,
  });
  await browser.storage.local.remove(LEGACY_POST_SNAPSHOTS_KEY);
}
export const LEGACY_POST_SNAPSHOTS_KEY = "posts";
export function detachLegacyScreenshots(
  legacySnapshot: LegacyPostSnapshot,
): PostScrapingResult {
  const screenshots: Record<string, string> = {};
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
