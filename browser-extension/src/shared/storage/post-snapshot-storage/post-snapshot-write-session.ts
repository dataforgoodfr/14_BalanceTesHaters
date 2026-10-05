import type { CommentSnapshot, PostSnapshot } from "../../model/PostSnapshot";
import { PostSnapshotSchema } from "../../model/PostSnapshot";
import type { ScrapingScreenshots } from "../../model/scraping/ScrapingScreenshots";
import {
  MAX_SCREENSHOT_CHUNK_BYTES,
  postSnapshotScreenshotChunkKey,
  ScreenshotDataByCommentSnapshotIdSchema,
  type StoredScreenshotChunk,
  writePostSnapshotRecord,
} from "./post-snapshot-storage-format";

export type PostSnapshotWriteSession = {
  readonly postSnapshotId: string;
  appendScreenshots(screenshots: ScrapingScreenshots): Promise<void>;
  commit(postSnapshot: PostSnapshot): Promise<void>;
  abort(): Promise<void>;
};

export class StoragePostSnapshotWriteSession implements PostSnapshotWriteSession {
  private readonly chunkBuilder = new ScreenshotChunkBuilder();
  private writtenChunkCount = 0;
  private state: "open" | "committed" | "aborted" = "open";

  constructor(readonly postSnapshotId: string) {}

  async appendScreenshots(screenshots: ScrapingScreenshots): Promise<void> {
    this.assertOpen();
    ScreenshotDataByCommentSnapshotIdSchema.parse(screenshots);
    for (const commentSnapshotId of Object.keys(screenshots)) {
      if (this.chunkBuilder.hasScreenshot(commentSnapshotId)) {
        throw new Error(
          `Screenshot already appended for comment ${commentSnapshotId}`,
        );
      }
    }

    for (const chunk of this.chunkBuilder.appendScreenshots(screenshots)) {
      await this.writeChunk(chunk);
    }
  }

  async commit(postSnapshot: PostSnapshot): Promise<void> {
    this.assertOpen();
    PostSnapshotSchema.parse(postSnapshot);
    if (postSnapshot.id !== this.postSnapshotId) {
      throw new Error(
        `Cannot commit PostSnapshot ${postSnapshot.id} in session ${this.postSnapshotId}`,
      );
    }
    assertScreenshotIdsBelongToSnapshot(
      postSnapshot,
      Object.keys(this.chunkBuilder.getChunkIndexByCommentSnapshotId()),
    );
    for (const chunk of this.chunkBuilder.finish()) {
      await this.writeChunk(chunk);
    }
    await writePostSnapshotRecord({
      postSnapshot,
      screenshotChunkIndexByCommentSnapshotId:
        this.chunkBuilder.getChunkIndexByCommentSnapshotId(),
      screenshotChunkCount: this.writtenChunkCount,
    });
    this.state = "committed";
  }

  async abort(): Promise<void> {
    if (this.state !== "open") return;
    const chunkKeys = Array.from(
      { length: this.writtenChunkCount },
      (_, index) => postSnapshotScreenshotChunkKey(this.postSnapshotId, index),
    );
    if (chunkKeys.length > 0) {
      await browser.storage.local.remove(chunkKeys);
    }
    this.chunkBuilder.clear();
    this.state = "aborted";
  }

  private async writeChunk(chunk: StoredScreenshotChunk) {
    await browser.storage.local.set({
      [postSnapshotScreenshotChunkKey(
        this.postSnapshotId,
        this.writtenChunkCount,
      )]: chunk,
    });
    this.writtenChunkCount++;
  }

  private assertOpen(): void {
    if (this.state !== "open") {
      throw new Error(`PostSnapshot write session is ${this.state}`);
    }
  }
}

class ScreenshotChunkBuilder {
  private current: StoredScreenshotChunk = { screenshots: {} };
  private currentScreenshotDataLength = 0;
  private completedChunkCount = 0;
  private readonly chunkIndexByCommentSnapshotId: Record<string, number> = {};

  appendScreenshots(screenshots: ScrapingScreenshots): StoredScreenshotChunk[] {
    const completedChunks: StoredScreenshotChunk[] = [];
    for (const [commentSnapshotId, data] of Object.entries(screenshots).sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      if (!data) continue;

      if (
        this.currentScreenshotDataLength > 0 &&
        this.currentScreenshotDataLength + data.length >
          MAX_SCREENSHOT_CHUNK_BYTES
      ) {
        completedChunks.push(this.current);
        this.completedChunkCount++;
        this.current = { screenshots: { [commentSnapshotId]: data } };
        this.currentScreenshotDataLength = data.length;
      } else {
        this.current.screenshots[commentSnapshotId] = data;
        this.currentScreenshotDataLength += data.length;
      }
      this.chunkIndexByCommentSnapshotId[commentSnapshotId] =
        this.completedChunkCount;
    }
    return completedChunks;
  }

  finish(): StoredScreenshotChunk[] {
    if (Object.keys(this.current.screenshots).length === 0) return [];
    const lastChunk = this.current;
    this.current = { screenshots: {} };
    this.currentScreenshotDataLength = 0;
    this.completedChunkCount++;
    return [lastChunk];
  }

  hasScreenshot(commentSnapshotId: string): boolean {
    return commentSnapshotId in this.chunkIndexByCommentSnapshotId;
  }

  getChunkIndexByCommentSnapshotId(): Record<string, number> {
    return { ...this.chunkIndexByCommentSnapshotId };
  }

  clear(): void {
    this.current = { screenshots: {} };
    this.currentScreenshotDataLength = 0;
  }
}

function assertScreenshotIdsBelongToSnapshot(
  postSnapshot: PostSnapshot,
  screenshotIds: string[],
): void {
  const commentSnapshotIds = new Set<string>();
  const visit = (comments: CommentSnapshot[]) => {
    for (const comment of comments) {
      commentSnapshotIds.add(comment.id);
      visit(comment.replies);
    }
  };
  visit(postSnapshot.comments);

  const unknownScreenshotId = screenshotIds.find(
    (id) => !commentSnapshotIds.has(id),
  );
  if (unknownScreenshotId) {
    throw new Error(
      `Screenshot ${unknownScreenshotId} does not belong to PostSnapshot ${postSnapshot.id}`,
    );
  }
}
