import type {
  CommentSnapshot,
  PostSnapshot,
} from "@/shared/model/PostSnapshot";
import type {
  ClassificationAuthor,
  ClassificationComment,
  ClassificationRequest,
} from "../api/submitClassificationRequest";
import type { Author } from "@/shared/model/Author";

export function mapPostToClassificationRequest(
  post: PostSnapshot,
): ClassificationRequest {
  return {
    title: post.title,
    text_content: post.textContent,
    author: adaptAuthorForApi(post.author),
    comments: post.comments.map((c) => mapCommentForApi(c)),
  };
}

function mapCommentForApi(comment: CommentSnapshot): ClassificationComment {
  return {
    id: comment.id,
    text_content: comment.textContent,
    author: adaptAuthorForApi(comment.author),
    replies: comment.replies.map(mapCommentForApi),
  };
}

function adaptAuthorForApi(author: Author): ClassificationAuthor {
  return {
    name: author.name,
    account_href: author.accountHref,
  };
}
