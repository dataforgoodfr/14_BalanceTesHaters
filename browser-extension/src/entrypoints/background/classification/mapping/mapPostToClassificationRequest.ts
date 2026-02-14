import { Author, Comment, Post as ScrapingPost } from "@/shared/model/post";
import {
  ClassificationAuthor,
  ClassificationComment,
  ClassificationRequest,
} from "../api/submitClassificationRequest";

export function mapPostToClassificationRequest(
  post: ScrapingPost,
): ClassificationRequest {
  return {
    title: post.title,
    text_content: post.textContent,
    author: adaptAuthorForApi(post.author),
    comments: post.comments.map((c) => mapCommentForApi(c)),
  };
}

function mapCommentForApi(comment: Comment): ClassificationComment {
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
