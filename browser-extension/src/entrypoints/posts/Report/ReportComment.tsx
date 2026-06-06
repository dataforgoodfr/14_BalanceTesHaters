import { PostCommentWithId } from "../Posts/CommentsTable";
import { Post } from "@/shared/model/post/Post";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";
import { ReportOrganizationType } from "./Stepper/BuildReport";
import {
  getLabelAnalysisComment,
  getLabelPublishedComment,
  getTitlePublicationHeader,
  LABEL_PSEUDO_AUTEUR,
  LABEL_SCORE_JURIDIQUE,
  LABEL_URL,
} from "./reportData";

interface ReportCommentProps {
  comment: PostCommentWithId;
  onScreenshotClick: (screenshot: string) => void;
  index: number;
  totalItems: number;
  reportOrganizationType: ReportOrganizationType;
  post?: Post;
}

export const ReportComment = ({
  comment,
  onScreenshotClick,
  index,
  totalItems,
  reportOrganizationType,
  post,
}: ReportCommentProps) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 px-4",
        index < totalItems - 1 ? "pb-4 mb-4 border-b" : "border-b-0",
      )}
    >
      <div className="flex justify-between">
        <div>
          {comment.classification?.map((label) => (
            <span
              key={label}
              className="border rounded-2xl px-1 text-destructive"
            >
              {label}
            </span>
          ))}
        </div>
        <div>
          {/* TODO: ajouter alerte sécurité */}
          <div className="flex items-center gap-2">
            <Scale size="12" />
            {LABEL_SCORE_JURIDIQUE}
          </div>
        </div>
      </div>
      <div className="flex w-full">
        <div className="flex justify-between gap-2 w-full">
          <button
            type="button"
            onClick={() => onScreenshotClick(comment.screenshotData)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onScreenshotClick(comment.screenshotData);
              }
            }}
            className="cursor-pointer h-full max-h-full rounded-2xl border p-2 bg-white hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity"
            aria-label="Afficher la capture d'écran du commentaire"
          >
            <img
              src={buildDataUrl(comment.screenshotData, PNG_MIME_TYPE)}
              alt="Capture d'écran du commentaire"
              className="h-full max-h-full"
            />
          </button>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">
              {getLabelPublishedComment(comment.publishedAt)}
            </span>
            <span className="text-xs text-muted-foreground">
              {getLabelAnalysisComment(post?.latestAnalysisDate)}
            </span>
          </div>
        </div>
      </div>
      <div className="text-muted-foreground self-start">
        {reportOrganizationType === ReportOrganizationType.BY_AUTHOR && post ? (
          <>
            {LABEL_URL}
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              {post.url}
            </a>
            {"  "}• {getTitlePublicationHeader(post.publishedAt)} : &quot;
            {post.title}&quot;
          </>
        ) : (
          <>
            {LABEL_PSEUDO_AUTEUR}
            {comment.author.name}
          </>
        )}
      </div>
    </div>
  );
};
