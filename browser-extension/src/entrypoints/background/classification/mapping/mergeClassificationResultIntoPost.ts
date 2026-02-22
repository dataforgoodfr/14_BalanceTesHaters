import { CommentSnapshot, PostSnapshot } from "@/shared/model/PostSnapshot";
import {
  ClassificationResult,
  CommentClassificationResult,
} from "../api/getClassificationResult";

export function mergeClassificationResultIntoPost(
  post: PostSnapshot,
  result: ClassificationResult,
): PostSnapshot {
  // Update comments with classifications only if COMPLETED
  const comments =
    result.status === "COMPLETED"
      ? post.comments.map((c) =>
          commentWithClassification(c, result.comments || {}),
        )
      : post.comments;
  const updatedPost: PostSnapshot = {
    ...post,
    classificationStatus: result.status,
    comments: comments,
  };
  return updatedPost;
}

function commentWithClassification(
  comment: CommentSnapshot,
  commentClassifications: Record<string, CommentClassificationResult>,
): CommentSnapshot {
  const classificationResult = commentClassifications[comment.id];
  return {
    ...comment,
    classification: classificationResult?.classification,
    classifiedAt: classificationResult?.classified_at,
    replies: comment.replies.map((reply) =>
      commentWithClassification(reply, commentClassifications),
    ),
  };
}
