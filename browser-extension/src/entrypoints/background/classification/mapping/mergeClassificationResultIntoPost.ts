import { Comment, Post } from "@/shared/model/post";
import {
  ClassificationResult,
  CommentClassificationResult,
} from "../api/getClassificationResult";

export function mergeClassificationResultIntoPost(
  post: Post,
  result: ClassificationResult,
): Post {
  // Update comments with classifications only if COMPLETED
  const comments =
    result.status === "COMPLETED"
      ? post.comments.map((c) =>
          commentWithClassification(c, result.comments || {}),
        )
      : post.comments;
  const updatedPost: Post = {
    ...post,
    classificationStatus: result.status,
    comments: comments,
  };
  return updatedPost;
}

function commentWithClassification(
  comment: Comment,
  commentClassifications: Record<string, CommentClassificationResult>,
): Comment {
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
