import type { PostComment } from "./Post";
import type { CommentSnapshot, PostSnapshot } from "../PostSnapshot";
import { flattenCommentsSnapshotReplies } from "../PostSnapshot";
import type { CommentScreenshotRef } from "../CommentScreenshot";

/**
 * Extra information needed to track which comments have screenshot
 */
export type ScreenshotCommentIdsByPostSnapshotId = ReadonlyMap<
  PostSnapshot["id"],
  ReadonlySet<CommentSnapshot["id"]>
>;

/**
 * Builds PostComment array by:
 *  * Flattening replies hiearchy
 *  * Deduping PostSnapshot on comment id and consecutive same text content
 * NOTE: provided postSnapshots MUST BE ORDERED by scrapedAt chronologiycal order with oldest first
 * @param postSnapshots list of post sanpshot to merge.
 * @returns
 */
export function buildCommentsFromSnapshots(
  postSnapshots: PostSnapshot[],
  screenshotCommentIdsByPostSnapshotId: ScreenshotCommentIdsByPostSnapshotId,
): PostComment[] {
  // Flatten all comments from all snapshots adding  post index info
  const flattenedCommentSnapshots: CommentSnapshotWithPostInfo[] =
    buildFlattenCommentSnapshotsWithPostInfo(
      postSnapshots,
      screenshotCommentIdsByPostSnapshotId,
    );

  // Group by same comment id
  const commentSnapshotsGroupedByCommentId: CommentSnapshotWithPostInfo[][] =
    groupByCommentId(flattenedCommentSnapshots);

  // Split those by comment group on textContent changes
  const commentSnapshotsGroupedByCommentIdAndTextContent: CommentSnapshotWithPostInfo[][] =
    commentSnapshotsGroupedByCommentId.flatMap((group) =>
      splitOnTextContentChanges(group),
    );

  // For each group build the resulting comments
  return commentSnapshotsGroupedByCommentIdAndTextContent.map((group) =>
    buildPostCommentForGroupOfSameText(group, postSnapshots.length),
  );
}

/**
 * CommentSnapshot holder carrying addiitonal info on PostSnapshot origin required for PostComment computation
 */
type CommentSnapshotWithPostInfo = {
  /**
   * Position of the post snapshot from which this comment is coming.
   */
  postSnapshotIndex: number;
  postSnapshotId: PostSnapshot["id"];
  hasScreenshot: boolean;
  commentSnapshot: CommentSnapshot;
};

function buildFlattenCommentSnapshotsWithPostInfo(
  postSnapshots: PostSnapshot[],
  screenshotCommentIdsByPostSnapshotId: ScreenshotCommentIdsByPostSnapshotId,
): CommentSnapshotWithPostInfo[] {
  return postSnapshots.flatMap((postSnapshot, postSnapshotIndex) =>
    flattenCommentsSnapshotReplies(
      postSnapshot.comments,
    ).map<CommentSnapshotWithPostInfo>((commentSnapshot) => ({
      commentSnapshot,
      postSnapshotIndex,
      postSnapshotId: postSnapshot.id,
      hasScreenshot:
        screenshotCommentIdsByPostSnapshotId
          .get(postSnapshot.id)
          ?.has(commentSnapshot.id) ?? false,
    })),
  );
}

function groupByCommentId(
  flattenedCommentSnapshots: CommentSnapshotWithPostInfo[],
): CommentSnapshotWithPostInfo[][] {
  const groups = Object.groupBy(flattenedCommentSnapshots, (cs) =>
    commentId(cs.commentSnapshot),
  );

  return Object.values(groups).filter((g) => g !== undefined);
}

function splitOnTextContentChanges(
  group: CommentSnapshotWithPostInfo[],
): CommentSnapshotWithPostInfo[][] {
  const groups: CommentSnapshotWithPostInfo[][] = [];

  // Add first comment to a first group
  groups.push([group[0]!]);

  const remainingComments = group.slice(1);
  for (const comment of remainingComments) {
    const currentGroup = groups[groups.length - 1]!;
    const currentGroupFirstComment = currentGroup[0]!;
    if (
      comment.commentSnapshot.textContent ===
      currentGroupFirstComment.commentSnapshot.textContent
    ) {
      // Text content equal => Add to current group
      currentGroup.push(comment);
    } else {
      // Text content differ => Create a new group
      groups.push([comment]);
    }
  }

  return groups;
}

function buildPostCommentForGroupOfSameText(
  commentSnapshotsGroup: CommentSnapshotWithPostInfo[],
  postSnapshotsCount: number,
): PostComment {
  const sortedByScrapedAt = commentSnapshotsGroup.toSorted((a, b) =>
    a.commentSnapshot.scrapedAt.localeCompare(b.commentSnapshot.scrapedAt),
  );
  const groupOldestComment = sortedByScrapedAt[0]!;
  const groupLatestComment = sortedByScrapedAt[sortedByScrapedAt.length - 1]!;

  const isGroupOldestCommentFromLatestSnapshot =
    groupOldestComment.postSnapshotIndex === postSnapshotsCount - 1;

  const isGroupLatestCommentFromLatestSnapshot =
    groupLatestComment.postSnapshotIndex === postSnapshotsCount - 1;

  return {
    textContent: groupOldestComment.commentSnapshot.textContent,
    publishedAt: groupOldestComment.commentSnapshot.publishedAt,
    author: groupOldestComment.commentSnapshot.author,
    screenshotRef: selectScreenshotRef(sortedByScrapedAt),
    classification: groupOldestComment.commentSnapshot.classification,
    hateScore: groupOldestComment.commentSnapshot.hateScore,
    classifiedAt: groupOldestComment.commentSnapshot.classifiedAt,
    url: groupLatestComment.commentSnapshot.url,
    isNew: postSnapshotsCount > 1 && isGroupOldestCommentFromLatestSnapshot,
    isDeleted: !isGroupLatestCommentFromLatestSnapshot,
  };
}

function selectScreenshotRef(
  sortedByScrapedAt: CommentSnapshotWithPostInfo[],
): CommentScreenshotRef | undefined {
  const selected = sortedByScrapedAt.findLast((item) => item.hasScreenshot);
  return selected
    ? {
        postSnapshotId: selected.postSnapshotId,
        commentSnapshotId: selected.commentSnapshot.id,
      }
    : undefined;
}

function commentId(comment: CommentSnapshot): string {
  if (comment.commentId) {
    return comment.commentId;
  }

  if (comment.publishedAt.type === "absolute") {
    // Use author + date as alternate comment id
    return comment.author.name + "@" + comment.publishedAt.date;
  }

  throw new Error("Need a comment id or an absolute date");
}
