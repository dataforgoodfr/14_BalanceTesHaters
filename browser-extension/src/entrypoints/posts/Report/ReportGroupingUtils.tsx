import { PostCommentWithId } from "../Posts/CommentsTable";
import { Post } from "@/shared/model/post/Post";
import { PublicationDate } from "@/shared/model/PublicationDate";
import React from "react";
import { ReportOrganizationType } from "./BuildReport";

export interface GroupedData {
  groupKey: string;
  comments: PostCommentWithId[];
  headerContent: React.ReactNode;
  postLatestAnalysisDate: Date;
  post?: Post;
  reportOrganizationType: ReportOrganizationType;
  commentPostMap?: Map<string, Post>;
}

function getPostDisplayDate(date: PublicationDate): string {
  if (date.type === "absolute") {
    return new Date(date.date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return "Date inconnue";
}

const HeaderContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-2 items-start">{children}</div>
);

const createPublicationHeader = (post: Post): React.ReactNode => (
  <HeaderContainer>
    <span className="text-lg font-semibold">
      Publication du {getPostDisplayDate(post.publishedAt)}
    </span>
    <span>{post.title}</span>
    <span>
      URL :{" "}
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
      {commentCount} commentaire{commentCount > 1 ? "s" : ""} • Score juridique
      moyen : N/A
    </span>
  </HeaderContainer>
);

export const getPublicationGroups = (
  posts: Post[] | undefined,
  comments: PostCommentWithId[],
): GroupedData[] => {
  return Array.from(posts ?? []).map((post) => ({
    groupKey: post.postId + "-" + post.socialNetwork,
    comments: comments.filter(
      (comment) => comment.postKey === post.postId + "-" + post.socialNetwork,
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

    // Map comment to its post for later retrieval
    if (posts) {
      const post = posts.find(
        (p) => p.postId + "-" + p.socialNetwork === comment.postKey,
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
    commentPostMap,
  }));
};
