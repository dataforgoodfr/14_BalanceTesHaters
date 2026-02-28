import { PostComment } from "./Post";
import { CommentSnapshot, PostSnapshot } from "../PostSnapshot";
import { LayoutTemplate } from "lucide-react";
import { PublicationDate } from "../PublicationDate";

/**
 * 
### 
 PostSnapshot1
  => Commentaire 1
  => Commentaire 2
  => Commentaire 3 

PostSnapshot2
  => Commentaire 1
  => Commentaire 2 => Edité
  => Commentaire 3 => Supprimé
  => Commentaire 4 

Post
  => Commentaire 1
  => Commentaire 2
  => Commentaire 2 v2
  => Commentaire 3 (supprimé) 
  => Commentaire 4
 */
class CommentsBuilder {
  private readonly commentsHolders: CommentSnapshotsHolder[] = [];

  constructor() {}

  /**
   * To be called in order for each  snapshots from oldest to most recent
   * @param commentSnapshots
   */
  addSnapshotComments(commentSnapshots: CommentSnapshot[]): void {
    let minIndex = 0;
    for (const commentSnapshot of commentSnapshots) {
      const matching = self.findMatchingCommentIndex(minIndex, commentSnapshot);

      if (this.commentsHolders.length < minIndex) {
        this.commentsHolders.push({ snapshots: [commentSnapshot] });
        continue;
      }

      minIndex++;
    }
  }

  private findMatchingCommentIndex(
    minIndex: number,
    commentSnapshot: CommentSnapshot,
  ): number {
    this.commentsHolders.findIndex((holder, index) => 
      index >= minIndex && isHolderMatchingComment(holder.
    );
  }

  

  buildComments(): PostComment[] {
    return [];
  }
}

export function buildCommentsFromSnapshots(
  allCommentSnapshots: CommentSnapshot[][],
): PostComment[] {
  const builder = new CommentsBuilder();
  for (const snapshotComments of allCommentSnapshots) {
    builder.addSnapshotComments(snapshotComments);
  }

  return builder.buildComments();
}

function isHolderMatchingComment(commentsSnapshotsHolder: CommentSnapshotsHolder, commentSnapshot:CommentSnapshot): boolean {
    
  const lastestSnapshot = commentsSnapshotsHolder.snapshots[commentsSnapshotsHolder.snapshots.length - 1]!;
  if (lastestSnapshot.commentId && commentSnapshot.commentId) {
    return lastestSnapshot.commentId == commentSnapshot.commentId
  }
  // Fallback to author + date comparison
  return lastestSnapshot.author == commentSnapshot.author && areDateMatching(lastestSnapshot.publishedAt, commentSnapshot.publishedAt)
  
}

function areDateMatching(date1:PublicationDate, date2:PublicationDate): boolean {
  if (date1.type === "absolute" && date2.type === "absolute") {
    return date1.date == date2.date;
  }
  throw new Error("Comparing non absolute date is not yet implemented");
}

type CommentSnapshotsHolder = {
  // Keeps positional comments
  // undefined if comment is not present for snapshot at corresponding index
  snapshots: Array<CommentSnapshot | undefined>;
};
