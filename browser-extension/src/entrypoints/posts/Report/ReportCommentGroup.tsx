import type { PostCommentWithFlag } from "@/shared/model/post/Post";
import type { Post } from "@/shared/model/post/Post";
import { ReportComment } from "./ReportComment";
import type React from "react";
import type { ReportOrganizationType } from "@/shared/model/ReportOrganizationType";
import type { ReportScreenshotData } from "./reportScreenshots";

interface CommentGroupProps {
  groupKey: string;
  comments: PostCommentWithFlag[];
  headerContent: React.ReactNode;
  onScreenshotClick: (screenshot: string) => void;
  reportOrganizationType: ReportOrganizationType;
  commentPostMap?: Map<string, Post>;
  screenshotData: ReportScreenshotData;
}

export const ReportCommentGroup = ({
  groupKey,
  comments,
  headerContent,
  onScreenshotClick,
  reportOrganizationType,
  commentPostMap,
  screenshotData,
}: CommentGroupProps) => (
  <div key={groupKey} className="flex flex-col border rounded-xl">
    <div className="flex justify-between p-4 bg-indigo-50 rounded-t-xl">
      {headerContent}
    </div>
    <div className="py-4 rounded-lg border bg-neutral-50">
      {comments?.map((comment, index) => (
        <ReportComment
          key={comment.commentRevisionId}
          comment={comment}
          onScreenshotClick={onScreenshotClick}
          index={index}
          totalItems={comments.length}
          reportOrganizationType={reportOrganizationType}
          post={commentPostMap?.get(comment.commentRevisionId)}
          screenshotData={screenshotData}
        />
      ))}
    </div>
  </div>
);
