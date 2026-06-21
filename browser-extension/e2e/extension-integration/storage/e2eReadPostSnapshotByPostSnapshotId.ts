import { BrowserContext } from "@playwright/test";
import { e2eReadPostSnapshotsFromStorage } from "./e2eReadPostSnapshotsFromStorage";
import { PostSnapshot } from "@/shared/model/PostSnapshot";

export async function e2eReadPostSnapshotByPostSnapshotId(
  context: BrowserContext,
  postSnapshotId: string,
): Promise<PostSnapshot | undefined> {
  const posts = await e2eReadPostSnapshotsFromStorage(context);
  const post = posts.find((p) => p.id === postSnapshotId);
  return post;
}
