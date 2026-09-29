import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import { PostSnapshotSchema } from "@/shared/model/PostSnapshot";
import type { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "../evaluate/evaluateInBackgroundWorker";

export async function e2eSeedPostSnapshots(
  context: BrowserContext,
  postSnapshots: PostSnapshot[],
): Promise<void> {
  const validPostSnapshots = PostSnapshotSchema.array().parse(postSnapshots);
  const seedPostStorage = async (snapshots: PostSnapshot[]) => {
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
  };

  await evaluateInBackgroundWorker(
    context,
    seedPostStorage,
    validPostSnapshots,
  );
}
