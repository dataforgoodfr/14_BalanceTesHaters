import { z } from "zod";
import { createLogger } from "../utils/createLogger";

const logger = createLogger("hate-flags-storage");

export const HATE_FLAGS_STORAGE_KEY_PREFIX = "hate-flags:v1:";

export const PostHateFlagsSchema = z
  .record(z.string(), z.boolean());

export type PostHateFlags = z.infer<typeof PostHateFlagsSchema>;

export async function getPostHateFlags(
  postSnapshotId: string,
): Promise<PostHateFlags> {
  const stored = await browser.storage.local.get(
    `${HATE_FLAGS_STORAGE_KEY_PREFIX}${postSnapshotId}`,
  );
  const value = stored[`${HATE_FLAGS_STORAGE_KEY_PREFIX}${postSnapshotId}`];
  const result = PostHateFlagsSchema.safeParse(value);
  if (!result.success) {
    logger.warn("Ignoring invalid hate flags", value);
    return {};
  }

  return result.data ?? {};
}

export async function setPostHateFlags(
  postSnapshotId: string,
  hateFlags: PostHateFlags,
): Promise<void> {
  const parsedHateFlags = PostHateFlagsSchema.parse(hateFlags);
  await browser.storage.local.set({
    [`${HATE_FLAGS_STORAGE_KEY_PREFIX}${postSnapshotId}`]: parsedHateFlags,
  });
}
