import { Post } from "@/entrypoints/shared/model/post";

export async function storePost(post: Post) {
  const posts: Post[] = await getPosts();
  const newPosts = [...posts, post];
  await browser.storage.local.set({ posts: newPosts });
}

export async function getPosts(): Promise<Post[]> {
  const partial = await browser.storage.local.get("posts");
  return (partial["posts"] as Post[]) || [];
}
