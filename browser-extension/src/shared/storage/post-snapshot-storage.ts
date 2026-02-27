import { PostSnapshot, PostSnapshotSchema } from "@/shared/model/PostSnapshot";

export async function updatePostSnapshot(postSnapshot: PostSnapshot) {
  const posts = await getPostSnapshots();
  const index = posts.findIndex((p) => p.id === postSnapshot.id);
  if (index === -1) {
    throw new Error(
      "Cannot find an existing PostSnapshot with id: " + postSnapshot.id,
    );
  } else {
    const newPosts = [...posts];
    newPosts[index] = postSnapshot;
    await writePostSnapshotsLists(newPosts);
  }
}

export async function insertPostSnapshot(postSnapshot: PostSnapshot) {
  const existingPosts = await getPostSnapshots();
  if (existingPosts.find((p) => p.id == postSnapshot.id)) {
    throw new Error("Post already exists with id: " + postSnapshot.id);
  }

  const newPosts = [...existingPosts, postSnapshot];
  await writePostSnapshotsLists(newPosts);
}

export async function deleteAllPostSnapshots() {
  await writePostSnapshotsLists([]);
}

export async function deletePostSnapshot(postSnapshotId: string) {
  const posts = await getPostSnapshots();
  const filtered = posts.filter((p) => !(p.id === postSnapshotId));
  if (filtered.length == posts.length) {
    throw new Error(
      "Cannot find an existing PostSnapshot with id: " + postSnapshotId,
    );
  }
  await writePostSnapshotsLists(filtered);
}

export async function getPostSnapshots(): Promise<PostSnapshot[]> {
  const partial = await browser.storage.local.get("posts");
  const rawPosts = partial["posts"] || [];

  const PostArraySchema = PostSnapshotSchema.array();
  const result = PostArraySchema.safeParse(rawPosts);
  if (result.success) {
    return result.data;
  }

  console.log(
    "Some posts records don't conform to schema. Invalid records will be filterd out. Errors: ",
    result.error,
  );
  const validPosts: PostSnapshot[] = [];
  if (Array.isArray(rawPosts)) {
    for (const rawPost of rawPosts) {
      const postResult = PostSnapshotSchema.safeParse(rawPost);
      if (postResult.success) {
        validPosts.push(postResult.data);
      }
    }
  }

  return validPosts;
}

export async function getPostSnapshotsBySocialNetworkAndPeriod(
  socialNetworkFilter: string[] = [],
  from?: Date,
  to?: Date,
): Promise<PostSnapshot[]> {
  let posts = await getPostSnapshots();
  console.log(socialNetworkFilter);
  if (socialNetworkFilter && socialNetworkFilter.length > 0) {
    posts = posts.filter((p) => socialNetworkFilter.includes(p.socialNetwork));
  }

  if (from) {
    posts = posts.filter((p) => new Date(p.scrapedAt) >= from);
  }
  if (to) {
    posts = posts.filter((p) => new Date(p.scrapedAt) <= to);
  }

  return posts;
}

export async function getPostSnapshotById(
  postSnapshotId: string,
): Promise<PostSnapshot | undefined> {
  const posts = await getPostSnapshots();
  return posts.find((p) => p.id === postSnapshotId);
}

export async function getPostSnapshotByPostIdAndScrapedAt(
  postId: string,
  scrapedAt: string,
): Promise<PostSnapshot | undefined> {
  const posts = await getPostSnapshots();
  return posts.find((p) => p.postId === postId && p.scrapedAt === scrapedAt);
}

export async function getPostSnapshotsByPostId(
  postId: string,
): Promise<PostSnapshot[]> {
  const posts = await getPostSnapshots();
  return posts.filter((p) => p.postId === postId);
}

async function writePostSnapshotsLists(newPosts: PostSnapshot[]) {
  await browser.storage.local.set({ posts: newPosts });
}
