import type { Post } from "./Post";
import type { PostSnapshot } from "../PostSnapshot";
import { buildPostFromSnapshots } from "./buildPostFromSnapshots";
import type { ScreenshotCommentIdsByPostSnapshotId } from "./buildCommentsFromSnapshots";

export function buildPostsFromSnapshots(
  snapshots: PostSnapshot[],
  screenshotCommentIdsByPostSnapshotId: ScreenshotCommentIdsByPostSnapshotId,
): Post[] {
  const groupedByPost = Object.groupBy(
    snapshots,
    (s) => s.socialNetwork + " " + s.postId,
  );
  return Object.values(groupedByPost)
    .filter((v) => v !== undefined)
    .map((postSnapshotGroup) =>
      buildPostFromSnapshots(
        postSnapshotGroup,
        screenshotCommentIdsByPostSnapshotId,
      ),
    );
}
