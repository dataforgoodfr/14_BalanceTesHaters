import { buildCommentsFromSnapshots } from "./buildCommentsFromSnapshots";
import { Post } from "./Post";
import { PostSnapshot } from "../PostSnapshot";

export function buildPostFromSnapshots(snapshots: PostSnapshot[]): Post {
  if (snapshots.length === 0) {
    throw new Error("At least one snapshot required");
  }
  if (new Set(snapshots.map((s) => s.postId)).size > 1) {
    throw new Error("All snapshot should have the same postId");
  }
  if (new Set(snapshots.map((s) => s.socialNetwork)).size > 1) {
    throw new Error("All snapshot should have the same socialNetwork");
  }
  const oldestFirst = snapshots.toSorted((a, b) =>
    a.scrapedAt.localeCompare(b.scrapedAt),
  );

  const oldest = oldestFirst[0];
  const latest = oldestFirst[oldestFirst.length - 1];

  return {
    postId: oldest.postId,
    socialNetwork: oldest.socialNetwork,
    url: oldest.url,

    publishedAt: latest.publishedAt,
    author: latest.author,
    coverImageUrl: latest.coverImageUrl,
    textContent: latest.textContent,
    title: latest.title,
    comments: buildCommentsFromSnapshots(snapshots.map((s) => s.comments)),
  };
}
