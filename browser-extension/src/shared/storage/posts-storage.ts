import { Post } from "@/shared/model/post";

export async function storePost(post: Post) {
  if (!post) {
    return;
  }
  const posts: Post[] = await getPosts();
  const newPosts = [...posts, post];
  await browser.storage.local.set({ posts: newPosts });
}

export async function setPostBackendId(
  postId: string,
  scrapedAt: string,
  backendId: string,
) {
  const posts: Post[] = await getPosts();
  const updatedPosts = posts.map((post) => {
    // Set the backendId of the post matching the postId and scrapedAt date
    if (post.postId === postId && post.scrapedAt === scrapedAt) {
      return { ...post, backendId };
    }
    return post;
  });

  await browser.storage.local.set({ posts: updatedPosts });
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
