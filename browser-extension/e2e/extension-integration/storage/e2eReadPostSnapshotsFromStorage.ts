import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import { PostSnapshotSchema } from "@/shared/model/PostSnapshot";
import type { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "../evaluate/evaluateInBackgroundWorker";

export async function e2eReadPostSnapshotsFromStorage(
  context: BrowserContext,
): Promise<PostSnapshot[]> {
  const evaluationFn = async () => {
    const keys = (await browser.storage.local.getKeys()).filter((key) =>
      key.startsWith("post-snapshots:v2:record:"),
    );
    const stored = await browser.storage.local.get(keys);
    return keys.map(
      (key) => (stored[key] as { postSnapshot: PostSnapshot }).postSnapshot,
    );
  };
  const posts: unknown = await evaluateInBackgroundWorker(
    context,
    evaluationFn,
  );

  return PostSnapshotSchema.array().parse(posts);
}
