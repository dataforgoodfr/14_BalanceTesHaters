import { z } from "zod";
import { createLogger } from "../utils/createLogger";
import { hashString } from "../utils/hash-util";

const logger = createLogger("hate-flags-storage");

export const HATE_FLAGS_STORAGE_KEY_PREFIX = "hate-flags:v1:";

export const HateFlagsSchema = z.record(z.string(), z.boolean());
export type HateFlags = z.infer<typeof HateFlagsSchema>;

export const PostHateFlagsSchema = z.object({
  postId: z.string(),
  hateFlags: HateFlagsSchema,
});
export type PostHateFlags = z.infer<typeof PostHateFlagsSchema>;


export function postHateFlagsRecordKey(postSnapshotId: string): string {
  return `${HATE_FLAGS_STORAGE_KEY_PREFIX}${postSnapshotId}`;
}

export async function commentHateFlagKey(commentId :string, textContent: string): Promise<string> {
  return `${commentId}:${await hashString(textContent)}`;
}

export async function getPostHateFlags(
  postSnapshotId: string,
): Promise<PostHateFlags> {
  const stored = await browser.storage.local.get(
    postHateFlagsRecordKey(postSnapshotId),
  );
  const value = stored[postHateFlagsRecordKey(postSnapshotId)];
  const result = PostHateFlagsSchema.safeParse(value);
  if (!result.success) {
    logger.warn("Ignoring invalid hate flags", value);
    return {
      postId: postSnapshotId,
      hateFlags: {},
    };
  }

  return result.data ?? {};
}

export async function getPostHateFlagsList(
  postSnapshotIdList: string[],
): Promise<PostHateFlags[]> {
  const hateFlagsPromises = postSnapshotIdList.map(getPostHateFlags);
  return Promise.all(hateFlagsPromises);
}

export async function setPostHateFlags(
  postSnapshotId: string,
  hateFlags: PostHateFlags,
): Promise<void> {
  const parsedHateFlags = PostHateFlagsSchema.parse(hateFlags);
  await browser.storage.local.set({
    [postHateFlagsRecordKey(postSnapshotId)]: parsedHateFlags,
  });
}

export async function deleteAllPostHateFlags() {
  const keys = await getPostHateFlagsDataKeys();
  if (keys.length > 0) {
    await browser.storage.local.remove(keys);
  }
}

export async function deletePostHateFlags(postSnapshotId: string) {
  await browser.storage.local.remove(postHateFlagsRecordKey(postSnapshotId));
}

export async function deletePostHateFlagsList(postSnapshotIdList: string[]) {
  const keys = postSnapshotIdList.map(postHateFlagsRecordKey);
  await browser.storage.local.remove(keys);
}

export async function getPostHateFlagsDataKeys(): Promise<string[]> {
  return (await browser.storage.local.getKeys()).filter((key) =>
    key.startsWith(HATE_FLAGS_STORAGE_KEY_PREFIX),
  );
}
