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
    await browser.storage.local.set({ posts: snapshots });
  };

  await evaluateInBackgroundWorker(
    context,
    seedPostStorage,
    validPostSnapshots,
  );
}
