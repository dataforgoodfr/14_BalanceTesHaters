import { Post, PostSchema } from "@/shared/model/post";

export async function upsertPost(post: Post) {
  if (!post) {
    return;
  }
  const posts = await getPosts();
  const index = posts.findIndex(
    (p) => p.postId === post.postId && p.scrapedAt === post.scrapedAt,
  );
  if (index === -1) {
    const newPosts = [...posts, post];
    await writePostLists(newPosts);
  } else {
    const newPosts = [...posts];
    newPosts[index] = post;
    await writePostLists(newPosts);
  }
}
export async function deleteAllPosts() {
  await writePostLists([]);
}

export async function deletePost(postId: string, scrapedAt: string) {
  const posts = await getPosts();
  const filtered = posts.filter(
    (p) => !(p.postId === postId && p.scrapedAt === scrapedAt),
  );
  await writePostLists(filtered);
}

export async function getPosts(): Promise<Post[]> {
  const partial = await browser.storage.local.get("posts");
  const rawPosts = partial["posts"];

  const PostArraySchema = PostSchema.array();
  const result = PostArraySchema.safeParse(rawPosts);
  if (result.success) {
    return result.data;
  }

  console.log(
    "Some posts records don't conform to schema. Invalid records will be filterd out. Errors: ",
    result.error,
  );
  const validPosts: Post[] = [];
  if (Array.isArray(rawPosts)) {
    for (const rawPost of rawPosts) {
      const postResult = PostSchema.safeParse(rawPost);
      if (postResult.success) {
        validPosts.push(postResult.data);
      }
    }
  }

  return validPosts;
}

export async function getPostByIdAndScrapedAt(
  postId: string,
  scrapedAt: string,
): Promise<Post | undefined> {
  const posts = await getPosts();
  return posts.find((p) => p.postId === postId && p.scrapedAt === scrapedAt);
}

async function writePostLists(newPosts: Post[]) {
  await browser.storage.local.set({ posts: newPosts });
}
