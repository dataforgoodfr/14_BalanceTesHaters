import { Post } from "@/shared/model/post";

export async function storePost(post: Post) {
  if (!post) {
    return;
  }
  const posts: Post[] = await getPosts();
  const newPosts = [...posts, post];
  await browser.storage.local.set({ posts: newPosts });
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
