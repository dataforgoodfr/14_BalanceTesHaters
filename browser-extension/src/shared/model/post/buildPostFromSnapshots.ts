import {
  buildCommentsFromSnapshots,
  type ScreenshotCommentIdsByPostSnapshotId,
} from "./buildCommentsFromSnapshots";
import type { Post } from "./Post";
import type { PostSnapshot } from "../PostSnapshot";
import { type PostHateFlags } from "@/shared/storage/hate-flags-storage";

export async function buildPostFromSnapshots(
  snapshots: PostSnapshot[],
  hateFlags: PostHateFlags[],
  screenshotCommentIdsByPostSnapshotId: ScreenshotCommentIdsByPostSnapshotId,
): Promise<Post> {
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

  const oldest = oldestFirst[0]!;
  const latest = oldestFirst[oldestFirst.length - 1]!;

  const matchingHateFlags = hateFlags.find(
    (hf) => hf.postId === oldest.postId,
  );

  return {
    postId: oldest.postId,
    socialNetwork: oldest.socialNetwork,
    url: oldest.url,

    publishedAt: latest.publishedAt,
    author: latest.author,
    coverImageUrl: latest.coverImageUrl,
    textContent: latest.textContent,
    title: latest.title,
    comments: await buildCommentsFromSnapshots(
      oldestFirst,
      matchingHateFlags?.hateFlags || {},
      screenshotCommentIdsByPostSnapshotId,
    ),
    firstAnalysisDate: oldest.scrapedAt,
    analysisCount: snapshots.length,
    latestAnalysisDate: latest.scrapedAt,
    latestAnalysisStatus: latest.classificationStatus,
  };
}
