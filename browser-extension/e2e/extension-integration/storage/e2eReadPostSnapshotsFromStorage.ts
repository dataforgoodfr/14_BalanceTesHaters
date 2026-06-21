import { PostSnapshot, PostSnapshotSchema } from "@/shared/model/PostSnapshot";
import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "../evaluate/evaluateInBackgroundWorker";

export async function e2eReadPostSnapshotsFromStorage(
  context: BrowserContext,
): Promise<PostSnapshot[]> {
  const evaluationFn = async () => {
    const partial = await browser.storage.local.get("posts");
    return partial["posts"] || [];
  };
  const posts: unknown = await evaluateInBackgroundWorker(
    context,
    evaluationFn,
  );

  return PostSnapshotSchema.array().parse(posts);
}
