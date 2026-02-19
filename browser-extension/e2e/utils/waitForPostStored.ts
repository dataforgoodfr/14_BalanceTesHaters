import { Post, PostSchema } from "@/shared/model/post";
import { sleep } from "@/shared/utils/sleep";
import { BrowserContext } from "@playwright/test";
import { evaluateInBackgroundWorker } from "./evaluateInBackgroundWorker";

export async function waitForPostStored(
  context: BrowserContext,
  postId: string,
  timeout: number,
): Promise<Post> {
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
): Promise<Post[]> {
  const evaluationFn = async () => {
    const partial = await browser.storage.local.get("posts");
    return partial["posts"] || [];
  };
  const posts: unknown = await evaluateInBackgroundWorker(
    context,
    evaluationFn,
  );

  return PostSchema.array().parse(posts);
}
