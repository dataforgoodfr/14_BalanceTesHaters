import { build } from "wxt";
import { CommentSnapshot, PostSnapshot } from "./PostSnapshot";
import { id } from "date-fns/locale";
import { buildCommentsFromSnapshots } from "./buildCommentsFromSnapshots";

/**
 * Merged view of Post Snapshot
 */
type Post = Pick<
  PostSnapshot,
  | "socialNetwork"
  | "postId"
  | "url"
  | "publishedAt"
  | "author"
  | "title"
  | "coverImageUrl"
  | "textContent"
> & {
  comments: PostComment[];
};

export type PostComment = Pick<
  CommentSnapshot,
  | "commentId"
  | "author"
  | "publishedAt"
  | "textContent"
  | "classification"
  | "classifiedAt"
> & {
  replies: PostComment[];
  /**
   * True if comment was added in latest snapshot of post
   */
  isNew: boolean;
  /**
   * True if comment was deleted in a more recent snapshot of post
   */
  isDelete: boolean;
};

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
