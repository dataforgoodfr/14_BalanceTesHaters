import { build } from "wxt";
import { CommentSnapshot, PostSnapshot } from "./PostSnapshot";
import { id } from "date-fns/locale";

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

type PostComment = Pick<
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

function buildCommentsFromSnapshots(
  allCommentSnapshots: CommentSnapshot[][],
): PostComment[] {
  const sortedCommentIds= [];
  
  allCommentSnapshots.flatMap(c =>c);
  allCommentSnapshots.
  const oldestSnapshotComments = allCommentSnapshots[0];

  
  const mergedComments = oldestSnapshotComments.map(c => ({
    commentId:c.commentId,
    author: c.author,
    publishedAt: c.publishedAt,
    textContet: c.textContent,
    classification: c.classification,
    classifiedAt: c.classifiedAt,
    isNew:false,
    isDelete:false
  }));

  => Build list of comment id 
    => 
  => Group by comment id
    => Cleanup
      => Dump

  if (allCommentSnapshots.length >=1) {
    for (const commentSnapshots of allCommentSnapshots.slice(1)) {
      for (const comment of commentSnapshots) {
        const idx = mergedComments.findIndex(c => c.commentId === comment.commentId)
        if (idx)   
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
