import type { Post } from "@/shared/model/post/Post";
import { ReportComment } from "./ReportComment";
import type React from "react";
import type { PostCommentWithId } from "@/shared/utils/post-util";
import type { ReportOrganizationType } from "@/shared/model/ReportOrganizationType";

interface CommentGroupProps {
  groupKey: string;
  comments: PostCommentWithId[];
  headerContent: React.ReactNode;
  onScreenshotClick: (screenshot: string) => void;
  reportOrganizationType: ReportOrganizationType;
  commentPostMap?: Map<string, Post>;
}

export const ReportCommentGroup = ({
  groupKey,
  comments,
  headerContent,
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
