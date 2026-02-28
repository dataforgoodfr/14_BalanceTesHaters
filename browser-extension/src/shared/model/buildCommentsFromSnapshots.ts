import { PostComment } from "./Post";
import { CommentSnapshot, PostSnapshot } from "./PostSnapshot";



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

type CommentsHolder = {
    // Keeps positional comments
    // undefined if comment is not present for snapshot at corresponding index
    snapshots: Array<CommentSnapshot|undefined>
}

class CommentsBuilder {

  private readonly commentsHolders: CommentsHolder[] = [];
  
  constructor() {

  }

  /**
   * To be called in order for each  snapshots from oldest to most recent 
   * @param commentSnapshots
   */
   addSnapshotComments(commentSnapshots: CommentSnapshot[]): void {
    let holderIndex = 0;
    for (const commentSnapshot of commentSnapshots) {
        if (this.commentsHolders.length < holderIndex) {
            this.commentsHolders.push({snapshots: [commentSnapshot]})
        } else {
            if 
        }
        holderIndex++;
    }
  }

   buildComments(): PostComment[] {
    return [];
  }

}


export function buildCommentsFromSnapshots(
  allCommentSnapshots: CommentSnapshot[][]): PostComment[] {
  const sortedCommentIds = [];

  allCommentSnapshots.flatMap(c => c);
  allCommentSnapshots.
    ;
  const oldestSnapshotComments = allCommentSnapshots[0];


  const mergedComments = oldestSnapshotComments.map(c => ({
    commentId: c.commentId,
    author: c.author,
    publishedAt: c.publishedAt,
    textContet: c.textContent,
    classification: c.classification,
    classifiedAt: c.classifiedAt,
    isNew: false,
    isDelete: false
  }));

  Build; list; of; comment; id
    => () => Group; by; comment; id
      => Cleanup
        => Dump;

  if (allCommentSnapshots.length >= 1) {
    for (const commentSnapshots of allCommentSnapshots.slice(1)) {
      for (const comment of commentSnapshots) {
        const idx = mergedComments.findIndex(c => c.commentId === comment.commentId);
        if (idx)
          ;
        // TODO find matching comment in mergtedComments by commentId
        // if not found add it (if latest snapshot mark new)
        // if found and same text as latest => ignore
        // if found and different text => consider different and add it
      }
      // TODO detect deleted!!
      // mergedComments.ined
    }
  }


  return mergedComments;
}
