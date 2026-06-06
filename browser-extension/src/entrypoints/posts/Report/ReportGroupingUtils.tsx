import { PostCommentWithId } from "../Posts/CommentsTable";
import { Post } from "@/shared/model/post/Post";
import React from "react";
import { ReportOrganizationType } from "./Stepper/BuildReport";
import {
  getSecondTextAuthorHeader,
  getTitlePublicationHeader,
  LABEL_URL,
} from "./reportData";
import { buildPostKey } from "@/shared/utils/post-util";

export interface GroupedData {
  groupKey: string;
  comments: PostCommentWithId[];
  headerContent: React.ReactNode;
  postLatestAnalysisDate: Date;
  post?: Post;
  reportOrganizationType: ReportOrganizationType;
  commentPostMap?: Map<string, Post>;
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
  authorName: string,
  commentCount: number,
): React.ReactNode => (
  <HeaderContainer>
    <span className="text-lg font-semibold">{authorName}</span>
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
  }));
};

export const getAuthorGroups = (
  comments: PostCommentWithId[],
  latestAnalysisDate: Date,
  posts: Post[] | undefined,
): GroupedData[] => {
  const grouped = new Map<string, PostCommentWithId[]>();
  const commentPostMap = new Map<string, Post>();

  comments.forEach((comment) => {
    const authorKey = comment.author.name;
    if (!grouped.has(authorKey)) {
      grouped.set(authorKey, []);
    }
    grouped.get(authorKey)!.push(comment);

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

  return Array.from(grouped.entries()).map(([authorName, commentList]) => ({
    groupKey: authorName,
    comments: commentList,
    headerContent: createAuthorHeader(authorName, commentList.length),
    postLatestAnalysisDate: latestAnalysisDate,
    reportOrganizationType: ReportOrganizationType.BY_AUTHOR,
    post: commentPostMap.get(commentList[0].id),
    commentPostMap,
  }));
};
