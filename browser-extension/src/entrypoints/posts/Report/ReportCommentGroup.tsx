import { PostCommentWithId } from "../Posts/CommentsTable";
import { Post } from "@/shared/model/post/Post";
import { ReportComment } from "./ReportComment";
import React from "react";
import { ReportOrganizationType } from "./BuildReport";

interface CommentGroupProps {
  groupKey: string;
  comments: PostCommentWithId[];
  headerContent: React.ReactNode;
  postLatestAnalysisDate: Date;
  onScreenshotClick: (screenshot: string) => void;
  reportOrganizationType: ReportOrganizationType;
  commentPostMap?: Map<string, Post>;
}

export const ReportCommentGroup = ({
  groupKey,
  comments,
  headerContent,
  postLatestAnalysisDate,
  onScreenshotClick,
  reportOrganizationType,
  commentPostMap,
}: CommentGroupProps) => (
  <div key={groupKey} className="flex flex-col border rounded-xl">
    <div className="flex justify-between p-4 bg-indigo-50 rounded-t-xl">
      {headerContent}
    </div>
    <div className="py-4 rounded-lg border bg-neutral-50">
      {comments?.map((comment, index) => (
        <ReportComment
          key={comment.id}
          comment={comment}
          postLatestAnalysisDate={postLatestAnalysisDate}
          onScreenshotClick={onScreenshotClick}
          index={index}
          totalItems={comments.length}
          reportOrganizationType={reportOrganizationType}
          post={commentPostMap?.get(comment.id)}
        />
      ))}
    </div>
  </div>
);
