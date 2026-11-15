import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import {
  commentHateFlagKey,
  postHateFlagsRecordKey,
} from "@/shared/storage/hate-flags-storage";
import { PostSnapshotSchema } from "@/shared/model/PostSnapshot";
import type { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "../evaluate/evaluateInBackgroundWorker";

export type E2EHateFlagSeed = Record<string, boolean>;

function flattenSnapshotComments(
  comments: PostSnapshot["comments"],
): PostSnapshot["comments"] {
  return comments.flatMap((comment) => [
    comment,
    ...flattenSnapshotComments(comment.replies),
  ]);
}

export async function e2eSeedPostSnapshots(
  context: BrowserContext,
  postSnapshots: PostSnapshot[],
  hateFlagSeeds: E2EHateFlagSeed = {},
): Promise<void> {
  const validPostSnapshots = PostSnapshotSchema.array().parse(postSnapshots);
  const hateFlagRecords: Record<string, unknown> = {};
  const unmatchedFlagSeeds = new Map(Object.entries(hateFlagSeeds));
  for (const snapshot of validPostSnapshots) {
    const hateFlags: Record<string, boolean> = {};
    for (const comment of flattenSnapshotComments(snapshot.comments)) {
      const isFlagged = unmatchedFlagSeeds.get(comment.commentId);
      if (isFlagged !== undefined) {
        hateFlags[await commentHateFlagKey(comment.textContent)] = isFlagged;
        unmatchedFlagSeeds.delete(comment.commentId);
      }
    }
    if (Object.keys(hateFlags).length > 0) {
      hateFlagRecords[postHateFlagsRecordKey(snapshot.postId)] = {
        postId: snapshot.postId,
        hateFlags,
      };
    }
  }
  if (unmatchedFlagSeeds.size > 0) {
    throw new Error(
      `Could not match hate flag comment IDs: ${[...unmatchedFlagSeeds.keys()].join(", ")}`,
    );
  }
  const seedPostStorage = async ({
    snapshots,
    hateFlagRecords,
  }: {
    snapshots: PostSnapshot[];
    hateFlagRecords: Record<string, unknown>;
  }) => {
    const screenshotData =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const flattenComments = (
      comments: PostSnapshot["comments"],
    ): PostSnapshot["comments"] =>
      comments.flatMap((comment) => [
        comment,
        ...flattenComments(comment.replies),
      ]);
    for (const snapshot of snapshots) {
      const screenshots = Object.fromEntries(
        flattenComments(snapshot.comments).map((comment) => [
          comment.id,
          screenshotData,
        ]),
      );
      await browser.storage.local.set({
        [`post-snapshots:v2:screenshot-chunk:${snapshot.id}:0`]: {
          screenshots,
        },
        [`post-snapshots:v2:record:${snapshot.id}`]: {
          postSnapshot: snapshot,
          screenshotChunkIndexByCommentSnapshotId: Object.fromEntries(
            Object.keys(screenshots).map((id) => [id, 0]),
          ),
          screenshotChunkCount: 1,
        },
      });
    }
    await browser.storage.local.set({
      "post-snapshots:storage-version": 2,
    });
    await browser.storage.local.set(hateFlagRecords);
  };

  await evaluateInBackgroundWorker(
    context,
    seedPostStorage,
    {
      snapshots: validPostSnapshots,
      hateFlagRecords,
    },
  );
}
