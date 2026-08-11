import type { BrowserContext } from "@playwright/test";
import { e2eReadPostSnapshotsFromStorage } from "./e2eReadPostSnapshotsFromStorage";
import type { PostSnapshot } from "@/shared/model/PostSnapshot";

export async function e2eReadPostSnapshotByPostId(
  context: BrowserContext,
  postId: string,
): Promise<PostSnapshot | undefined> {
  const posts = await e2eReadPostSnapshotsFromStorage(context);
  const post = posts.find((p) => p.postId === postId);
  return post;
}
