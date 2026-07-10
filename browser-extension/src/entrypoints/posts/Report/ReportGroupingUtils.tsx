import { Author } from "@/shared/model/Author";
import { Post } from "@/shared/model/post/Post";
import React from "react";
import { ReportOrganizationType } from "./Stepper/BuildReport";
import {
  getSecondTextAuthorHeader,
  getTitlePublicationHeader,
  LABEL_URL,
} from "./reportData";
import { buildPostKey, PostCommentWithId } from "@/shared/utils/post-util";

export interface GroupedData {
  groupKey: string;
  comments: PostCommentWithId[];
  headerContent: React.ReactNode;
  postLatestAnalysisDate: Date;
  post?: Post;
  reportOrganizationType: ReportOrganizationType;
  commentPostMap?: Map<string, Post>;
  author?: Author;
}

const HeaderContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-2 items-start">{children}</div>
);

const createPublicationHeader = (post: Post): React.ReactNode => (
  <HeaderContainer>
    <span className="text-lg font-semibold">
      {getTitlePublicationHeader(post.publishedAt)}
    </span>
    <span>{post.title}</span>
    <span>
      {LABEL_URL}
      <a href={post.url} target="_blank" rel="noopener noreferrer">
        {post.url}
      </a>
    </span>
  </HeaderContainer>
);

const createAuthorHeader = (
  author: Author,
  commentCount: number,
): React.ReactNode => (
  <HeaderContainer>
    <a
      className="text-lg font-semibold"
      href={author.accountHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      {author.name}
    </a>
    <span className="text-sm text-muted-foreground">
      {getSecondTextAuthorHeader(commentCount)}
    </span>
  </HeaderContainer>
);

export const getPublicationGroups = (
  posts: Post[] | undefined,
  comments: PostCommentWithId[],
): GroupedData[] => {
  return Array.from(posts ?? []).map((post) => ({
    groupKey: buildPostKey(post.postId, post.socialNetwork),
    comments: comments.filter(
      (comment) =>
        comment.postKey === buildPostKey(post.postId, post.socialNetwork),
    ),
    headerContent: createPublicationHeader(post),
    postLatestAnalysisDate: new Date(post.latestAnalysisDate),
    post,
    reportOrganizationType: ReportOrganizationType.BY_PUBLICATION,
    commentPostMap: getCommentPostMap(comments, posts),
  }));
};

export const getAuthorGroups = (
  comments: PostCommentWithId[],
  latestAnalysisDate: Date,
  posts: Post[] | undefined,
): GroupedData[] => {
  const grouped = new Map<string, PostCommentWithId[]>();
  const authorMap = new Map<string, Author>();
  const commentPostMap: Map<string, Post> = getCommentPostMap(comments, posts);

  comments.forEach((comment) => {
    const authorKey = comment.author.name;
    if (!grouped.has(authorKey)) {
      grouped.set(authorKey, []);
      authorMap.set(authorKey, comment.author);
    }
    grouped.get(authorKey)!.push(comment);
  });

  return Array.from(grouped.entries()).map(([authorName, commentList]) => ({
    groupKey: authorName,
    comments: commentList,
    headerContent: createAuthorHeader(
      authorMap.get(authorName) ?? { name: authorName, accountHref: "/" },
      commentList.length,
    ),
    postLatestAnalysisDate: latestAnalysisDate,
    reportOrganizationType: ReportOrganizationType.BY_AUTHOR,
    post: commentPostMap.get(commentList[0].id),
    commentPostMap: commentPostMap,
    author: authorMap.get(authorName),
  }));
};

function getCommentPostMap(
  comments: PostCommentWithId[],
  posts: Post[] | undefined,
): Map<string, Post> {
  const commentPostMap = new Map<string, Post>();

  comments.forEach((comment) => {
    let post: Post | undefined = undefined;
    // Map comment to its post for later retrieval
    if (posts) {
      post = posts.find(
        (p) => buildPostKey(p.postId, p.socialNetwork) === comment.postKey,
      );
      if (post) {
        commentPostMap.set(comment.id, post);
      }
    }
  });

  return commentPostMap;
}
