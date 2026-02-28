import { PostComment } from "./Post";
import {
  CommentSnapshot,
  flattenCommentsSnapshotReplies,
  PostSnapshot,
} from "../PostSnapshot";

type CommentSnapshotWithPostSnapshotInfo = {
  /**
   * True if part of latest post snapshot
   */
  isLatestPostSnapshot: boolean;
  commentSnapshot: CommentSnapshot;
};
export function buildCommentsFromSnapshots(
  postSnapshots: PostSnapshot[],
): PostComment[] {
  // Flatten all comments from all snapshots adding  post index info
  const flattenedCommentSnapshots: CommentSnapshotWithPostSnapshotInfo[] =
    postSnapshots.flatMap((postSnapshot, postSnapshotIndex) =>
      flattenCommentsSnapshotReplies(postSnapshot.comments).map(
        (commentSnapshot) => ({
          commentSnapshot,
          isLatestPostSnapshot: postSnapshotIndex === postSnapshots.length - 1,
        }),
      ),
    );

  // Group them by comment id
  const groupedCommentSnapshots = Object.groupBy(
    flattenedCommentSnapshots,
    (cs) => commentId(cs.commentSnapshot),
  );

  // For each group build the resulting comments
  return Object.entries(groupedCommentSnapshots).flatMap(
    ([_, commentSnapshotsInGroup]) =>
      buildPostCommentsForGroup(commentSnapshotsInGroup || []),
  );
}

function buildPostCommentsForGroup(
  snapshotCommentsInGroup: CommentSnapshotWithPostSnapshotInfo[],
): PostComment[] {
  if (snapshotCommentsInGroup.length === 0) return [];

  const postComments: PostComment[] = [];

  // ADD first
  snapshotCommentsInGroup.forEach((commentSnapshotWihPostInfo, index) => {
    if (
      // Also keep first snapshot
      index === 0 ||
      // Also keep first snapshot that changes text
      commentSnapshotWihPostInfo.commentSnapshot.textContent !==
        snapshotCommentsInGroup[index - 1].commentSnapshot.textContent
    ) {
      const snapshotsCommentsAfter = snapshotCommentsInGroup.slice(index + 1);
      postComments.push(
        createPostComment(commentSnapshotWihPostInfo.commentSnapshot, {
          isNew: commentSnapshotWihPostInfo.isLatestPostSnapshot,
          // Deleted means
          isDeleted:
            //  - A snapshot after changed text
            snapshotsCommentsAfter.some(
              (other) =>
                commentSnapshotWihPostInfo.commentSnapshot.textContent !==
                other.commentSnapshot.textContent,
            ) ||
            //  - Comment was completely deleted => No snapshot after have the isLatestPostSnapshot
            (!commentSnapshotWihPostInfo.isLatestPostSnapshot &&
              snapshotCommentsInGroup
                .slice(index + 1)
                .every((other) => !other.isLatestPostSnapshot)),
        }),
      );
    }
  });
  // iterator on remaining
  return postComments;
}

function createPostComment(
  commentSnapshot: CommentSnapshot,
  postCommentSpecificProps: Pick<PostComment, "isNew" | "isDeleted">,
): PostComment {
  return {
    commentSnapshotId: commentSnapshot.id,
    author: commentSnapshot.author,
    publishedAt: commentSnapshot.publishedAt,
    textContent: commentSnapshot.textContent,
    classification: commentSnapshot.classification,
    classifiedAt: commentSnapshot.classifiedAt,
    ...postCommentSpecificProps,
  };
}

function commentId(comment: CommentSnapshot): string {
  if (comment.commentId) {
    return comment.commentId;
  }

  if (comment.publishedAt.type === "absolute") {
    // Use author + date as alternate comment id
    return comment.author.name + "@" + comment.publishedAt.date;
  }
  throw new Error("Need a comment id or an oabsolute date");
}
