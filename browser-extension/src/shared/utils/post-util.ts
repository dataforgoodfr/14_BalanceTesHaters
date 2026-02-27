import { CommentSnapshot, PostSnapshot } from "../model/PostSnapshot";

export function isCommentHateful(comment: CommentSnapshot): boolean {
  return (comment.classification?.length ?? 0) > 0;
}

export function isPostPublishedAfter(post: PostSnapshot, date: Date): boolean {
  switch (post.publishedAt.type) {
    case "absolute":
      return new Date(post.publishedAt.date) > date;
    case "relative":
      return new Date(post.publishedAt.resolvedDateRange.end) > date;
    case "unknown date":
      return true; // if we don't know the date, we always consider the comment as published after the given date (to avoid excluding it from analyses)
  }
}

export function isPostPublishedBefore(post: PostSnapshot, date: Date): boolean {
  switch (post.publishedAt.type) {
    case "absolute":
      return new Date(post.publishedAt.date) < date;
    case "relative":
      return new Date(post.publishedAt.resolvedDateRange.start) < date;
    case "unknown date":
      return true; // if we don't know the date, we always consider the comment as published after the given date (to avoid excluding it from analyses)
  }
}

// Récupère tous les commentaires d'une liste de posts, ainsi que toutes leurs réponses (de manière récursive)
export function getAllCommentsAndRepliesFromPostList(
  posts: PostSnapshot[],
): CommentSnapshot[] {
  return posts.flatMap((post) => getAllCommentsAndRepliesFromPost(post));
}

// Récupère tous les commentaires d'un post, ainsi que toutes leurs réponses (de manière récursive)
export function getAllCommentsAndRepliesFromPost(
  post: PostSnapshot,
): CommentSnapshot[] {
  return (
    post.comments.reduce((allComments: CommentSnapshot[], currentComment) => {
      allComments.push(
        currentComment,
        ...getAllRepliesFromComment(currentComment),
      );
      return allComments;
    }, []) ?? []
  );
}

// Récupère récursivement toutes les réponses d'un commentaire
export function getAllRepliesFromComment(
  comment: CommentSnapshot,
): CommentSnapshot[] {
  return comment.replies?.reduce((allComments: CommentSnapshot[], reply) => {
    // Ajout des réponses directes du commentaire actuel
    allComments.push(reply);

    if (reply.replies.length > 0) {
      // Appel récursif pour chaque réponse afin d'obtenir les réponses imbriquées
      reply.replies.forEach((reply) => {
        allComments.push(...getAllRepliesFromComment(reply));
      });
    }
    return allComments;
  }, []);
}
