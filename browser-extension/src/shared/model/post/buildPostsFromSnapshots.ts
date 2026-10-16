import type { Post } from "./Post";
import type { PostSnapshot } from "../PostSnapshot";
import { buildPostFromSnapshots } from "./buildPostFromSnapshots";
import type { ScreenshotCommentIdsByPostSnapshotId } from "./buildCommentsFromSnapshots";
import type { PostHateFlags } from "@/shared/storage/hate-flags-storage";

export async function buildPostsFromSnapshots(
  snapshots: PostSnapshot[],
  hateFlags: PostHateFlags[],
  screenshotCommentIdsByPostSnapshotId: ScreenshotCommentIdsByPostSnapshotId,
): Promise<Post[]> {
  const groupedByPost = Object.groupBy(
    snapshots,
    (s) => s.socialNetwork + " " + s.postId,
  );
  return Promise.all(
    Object.values(groupedByPost)
      .filter((v) => v !== undefined)
      .map((postSnapshotGroup) =>
        buildPostFromSnapshots(
          postSnapshotGroup,
          hateFlags,
          screenshotCommentIdsByPostSnapshotId,
        ),
      ),
    );
}
