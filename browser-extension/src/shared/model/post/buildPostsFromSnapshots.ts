import type { Post } from "./Post";
import type { PostSnapshot } from "../PostSnapshot";
import { buildPostFromSnapshots } from "./buildPostFromSnapshots";

export function buildPostsFromSnapshots(snapshots: PostSnapshot[]): Post[] {
  const groupedByPost = Object.groupBy(
    snapshots,
    (s) => s.socialNetwork + " " + s.postId,
  );
  return Object.values(groupedByPost)
    .filter((v) => v !== undefined)
    .map((postSnapshotGroup) => buildPostFromSnapshots(postSnapshotGroup));
}
