import { Author, Comment, Post as ScrapingPost } from "@/shared/model/post";
import {
  ClassificationAuthor,
  ClassificationComment,
  ClassificationRequest,
} from "./api/requestClassification";

export function buildClassificationRequest(
  post: ScrapingPost,
): ClassificationRequest {
  return {
    title: post.title,
    text_content: post.textContent,
    author: adaptAuthorForApi(post.author),
    comments: post.comments.map((c) => adaptCommentForApi(c)),
  };
}

function adaptCommentForApi(comment: Comment): ClassificationComment {
  return {
    id: comment.id,
    text_content: comment.textContent,
    author: adaptAuthorForApi(comment.author),
    replies: comment.replies.map(adaptCommentForApi),
  };
}

function adaptAuthorForApi(author: Author): ClassificationAuthor {
  return {
    name: author.name,
    account_href: author.accountHref,
  };
}
