import { z } from "zod";
import type { CommentSnapshot } from "../../model/PostSnapshot";
import { PostSnapshotSchema } from "../../model/PostSnapshot";
import type { PostScrapingResult } from "../../model/PostScrapingResult";
import { createLogger } from "../../utils/createLogger";

const logger = createLogger("post-snapshot-storage-format");

export const POST_SNAPSHOTS_STORAGE_VERSION_KEY =
  "post-snapshots:storage-version";
export const POST_SNAPSHOTS_STORAGE_VERSION = 2;
export const MAX_SCREENSHOT_CHUNK_BYTES = 2 * 1024 * 1024;

const RECORD_KEY_PREFIX = "post-snapshots:v2:record:";
const SCREENSHOT_CHUNK_KEY_PREFIX = "post-snapshots:v2:screenshot-chunk:";

export const StoredScreenshotChunkSchema = z.object({
  screenshots: z.record(z.uuid(), z.base64()),
});

export const ScreenshotDataByCommentSnapshotIdSchema = z.record(
  z.uuid(),
  z.base64(),
);

export type StoredScreenshotChunk = z.infer<typeof StoredScreenshotChunkSchema>;

export const PostSnapshotRecordSchema = z.object({
  postSnapshot: PostSnapshotSchema,
  screenshotChunkIndexByCommentSnapshotId: z.record(z.uuid(), z.int().min(0)),
  screenshotChunkCount: z.int().min(0),
});

export type PostSnapshotRecord = z.infer<typeof PostSnapshotRecordSchema>;

export function postSnapshotRecordKey(postSnapshotId: string): string {
  return `${RECORD_KEY_PREFIX}${postSnapshotId}`;
}

export function postSnapshotScreenshotChunkKey(
  postSnapshotId: string,
  chunkIndex: number,
): string {
  return `${SCREENSHOT_CHUNK_KEY_PREFIX}${postSnapshotId}:${chunkIndex}`;
}

export async function readPostSnapshotStorageVersion(): Promise<unknown> {
  return (await browser.storage.local.get(POST_SNAPSHOTS_STORAGE_VERSION_KEY))[
    POST_SNAPSHOTS_STORAGE_VERSION_KEY
  ];
}

export function unsupportedStorageVersionError(version: unknown): Error {
  return new Error(
    `Unsupported post snapshot storage version: ${JSON.stringify(version)}`,
  );
}

export async function writePostSnapshot({
  postSnapshot,
  screenshots,
}: PostScrapingResult): Promise<void> {
  const { chunks, chunkIndexByCommentSnapshotId } =
    buildScreenshotChunks(screenshots);
  for (const [chunkIndex, chunk] of chunks.entries()) {
    await browser.storage.local.set({
      [postSnapshotScreenshotChunkKey(postSnapshot.id, chunkIndex)]: chunk,
    });
  }
  await writePostSnapshotRecord({
    postSnapshot,
    screenshotChunkIndexByCommentSnapshotId: chunkIndexByCommentSnapshotId,
    screenshotChunkCount: chunks.length,
  });
}

export async function writePostSnapshotRecord(
  record: PostSnapshotRecord,
): Promise<void> {
  PostSnapshotRecordSchema.parse(record);
  await browser.storage.local.set({
    [postSnapshotRecordKey(record.postSnapshot.id)]: record,
  });
}

export async function readPostSnapshotRecord(
  postSnapshotId: string,
): Promise<PostSnapshotRecord | undefined> {
  const key = postSnapshotRecordKey(postSnapshotId);
  const value = (await browser.storage.local.get(key))[key];
  if (value === undefined) {
    return undefined;
  }
  return PostSnapshotRecordSchema.parse(value);
}

export async function readPostSnapshotRecords(): Promise<PostSnapshotRecord[]> {
  const keys = (await browser.storage.local.getKeys()).filter((key) =>
    key.startsWith(RECORD_KEY_PREFIX),
  );
  if (keys.length === 0) {
    return [];
  }
  const stored = await browser.storage.local.get(keys);
  const records: PostSnapshotRecord[] = [];
  for (const key of keys) {
    const result = PostSnapshotRecordSchema.safeParse(stored[key]);
    if (result.success) {
      records.push(result.data);
    } else {
      logger.warn("Ignoring invalid PostSnapshotRecord", key, result.error);
    }
  }
  return records;
}

export async function getPostSnapshotDataKeys(): Promise<string[]> {
  return (await browser.storage.local.getKeys()).filter(
    (key) =>
      key.startsWith(RECORD_KEY_PREFIX) ||
      key.startsWith(SCREENSHOT_CHUNK_KEY_PREFIX),
  );
}

export async function getPostSnapshotStorageKeys(): Promise<string[]> {
  return (await browser.storage.local.getKeys()).filter(
    (key) =>
      key === POST_SNAPSHOTS_STORAGE_VERSION_KEY ||
      key.startsWith(RECORD_KEY_PREFIX) ||
      key.startsWith(SCREENSHOT_CHUNK_KEY_PREFIX),
  );
}

export function buildScreenshotChunks(
  screenshots: Record<CommentSnapshot["id"], string>,
): {
  chunks: StoredScreenshotChunk[];
  chunkIndexByCommentSnapshotId: Record<CommentSnapshot["id"], number>;
} {
  const chunks: StoredScreenshotChunk[] = [];
  const chunkIndexByCommentSnapshotId: Record<string, number> = {};
  let current: StoredScreenshotChunk = { screenshots: {} };

  for (const [commentSnapshotId, data] of Object.entries(screenshots).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (!data) {
      continue;
    }
    const candidate: StoredScreenshotChunk = {
      screenshots: { ...current.screenshots, [commentSnapshotId]: data },
    };
    if (
      Object.keys(current.screenshots).length > 0 &&
      serializedSize(candidate) > MAX_SCREENSHOT_CHUNK_BYTES
    ) {
      chunks.push(current);
      current = { screenshots: { [commentSnapshotId]: data } };
    } else {
      current = candidate;
    }
    chunkIndexByCommentSnapshotId[commentSnapshotId] = chunks.length;
  }
  if (Object.keys(current.screenshots).length > 0) {
    chunks.push(current);
  }
  return { chunks, chunkIndexByCommentSnapshotId };
}

function serializedSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
