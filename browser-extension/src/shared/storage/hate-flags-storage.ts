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

export function postHateFlagsRecordKey(postId: string): string {
  return `${HATE_FLAGS_STORAGE_KEY_PREFIX}${postId}`;
}

export async function commentHateFlagKey(textContent: string): Promise<string> {
  return `${await hashString(textContent)}`;
}

export async function getPostHateFlags(postId: string): Promise<PostHateFlags> {
  const stored = await browser.storage.local.get(
    postHateFlagsRecordKey(postId),
  );
  const value = stored[postHateFlagsRecordKey(postId)];
  const result = PostHateFlagsSchema.safeParse(value);
  if (!result.success) {
    logger.warn("Ignoring invalid hate flags", value);
    return {
      postId: postId,
      hateFlags: {},
    };
  }
  return result.data ?? {};
}

export async function getPostHateFlagsList(
  postIdList: string[],
): Promise<PostHateFlags[]> {
  const hateFlagsPromises = postIdList.map(getPostHateFlags);
  return Promise.all(hateFlagsPromises);
}

export async function updateCommentHateFlags(
  postId: string,
  hateFlags: { textContent: string; isFlagged: boolean }[],
): Promise<void> {
  const postHateFlags = await getPostHateFlags(postId);

  for (const { textContent, isFlagged } of hateFlags) {
    const key = await commentHateFlagKey(textContent);
    postHateFlags.hateFlags[key] = isFlagged;
  }

  await setPostHateFlags(postId, postHateFlags);
}

export async function setPostHateFlags(
  postId: string,
  hateFlags: PostHateFlags,
): Promise<void> {
  const parsedHateFlags = PostHateFlagsSchema.parse(hateFlags);
  await browser.storage.local.set({
    [postHateFlagsRecordKey(postId)]: parsedHateFlags,
  });
}

export async function deleteAllPostHateFlags() {
  const keys = await getPostHateFlagsDataKeys();
  if (keys.length > 0) {
    await browser.storage.local.remove(keys);
  }
}

export async function deletePostHateFlags(postId: string) {
  await browser.storage.local.remove(postHateFlagsRecordKey(postId));
}

export async function deletePostHateFlagsList(postIdList: string[]) {
  const keys = postIdList.map(postHateFlagsRecordKey);
  await browser.storage.local.remove(keys);
}

export async function getPostHateFlagsDataKeys(): Promise<string[]> {
  return (await browser.storage.local.getKeys()).filter((key) =>
    key.startsWith(HATE_FLAGS_STORAGE_KEY_PREFIX),
  );
}
