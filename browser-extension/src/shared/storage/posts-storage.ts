import { Post } from "@/shared/model/post";

export async function upsertPost(post: Post) {
  if (!post) {
    return;
  }
  const posts: Post[] = await getPosts();
  const index = posts.findIndex(
    (p) => p.postId === post.postId && p.scrapedAt === post.scrapedAt,
  );
  if (index === -1) {
    const newPosts = [...posts, post];
    await browser.storage.local.set({ posts: newPosts });
  } else {
    const newPosts = [...posts];
    newPosts[index] = post;
    await writePostLists(newPosts);
  }
}
export async function deleteAllPosts() {
  await writePostLists([]);
}

export async function removePost(postId: string, scrapedAt: string) {
  const posts: Post[] = await getPosts();
  const filtered = posts.filter(
    (p) => !(p.postId === postId && p.scrapedAt === scrapedAt),
  );
  await writePostLists(filtered);
}

export async function getPosts(): Promise<Post[]> {
  const partial = await browser.storage.local.get("posts");
  return (partial["posts"] as Post[]) || [];
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
