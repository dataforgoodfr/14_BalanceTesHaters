import { PostSnapshot, PostSnapshotSchema } from "@/shared/model/PostSnapshot";
import { sleep } from "@/shared/utils/sleep";
import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "./evaluateInBackgroundWorker";

export async function waitForPostStored(
  context: BrowserContext,
  postId: string,
  timeout: number,
): Promise<PostSnapshot> {
  const startDate = Date.now();
  for (;;) {
    const posts = await e2eReadAllPostsFromStorage(context);
    const post = posts.find((p) => p.postId === postId);
    if (post) {
      return post;
    }
    const delay = Date.now() - startDate;
    if (delay > timeout) {
      throw new Error("Timeout " + delay);
    }
    await sleep(2000);
  }
}

async function e2eReadAllPostsFromStorage(
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
