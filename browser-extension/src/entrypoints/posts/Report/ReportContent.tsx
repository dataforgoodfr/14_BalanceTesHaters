import { ReportQueryData } from "./BuildReport";
import { Scale } from "lucide-react";

import KpiCard from "../Shared/KpiCards/KpiCard";

import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";

import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { Post } from "@/shared/model/post/Post";
import { getEntriesGroupedByPostKey } from "@/shared/utils/report-data";
import SecurityAlert from "../Shared/KpiCards/SecurityAlert";
import { PublicationDate, RelativeDate } from "@/shared/model/PublicationDate";
import { getSocialNetworkName } from "@/shared/utils/post-util";
import { cn } from "@/lib/utils";
import { NoticeUtilisation } from "./NoticeUtilisation";

interface ReportContentProps {
  reportQueryData?: ReportQueryData;
  posts?: Post[];
  isLoadingPosts: boolean;
  setSelectedScreenshot: (screenshot: string | null) => void;
  setScreenshotDialogOpen: (open: boolean) => void;
}

export const ReportContent = ({
  reportQueryData,
  posts,
  isLoadingPosts,
  setSelectedScreenshot,
  setScreenshotDialogOpen,
}: ReportContentProps) => {
  const numberOfHatefulComments = reportQueryData?.postCommentList?.length ?? 0;

  const openScreenshotDialog = (screenshot: string) => {
    setSelectedScreenshot(screenshot);
    setScreenshotDialogOpen(true);
  };

  const groupedCommentsByPost = getEntriesGroupedByPostKey(
    reportQueryData?.postCommentList ?? [],
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        Rapport des commentaires malveillants
      </h1>
      <div className="flex gap-4 justify-between">
        <NumberHatefulAuhorsKpiCard
          hatefulCommentList={reportQueryData?.postCommentList ?? []}
          isLoading={isLoadingPosts}
        />
        <KpiCard
          title="Score juridique moyen"
          value="N/A"
          isWorkInProgress={true}
          isLoading={isLoadingPosts}
        />
        <NumberHatefulCommentsKpiCard
          numberOfHatefulComments={numberOfHatefulComments}
          isLoading={isLoadingPosts}
        />

        <SecurityAlert isLoading={isLoadingPosts}></SecurityAlert>
      </div>

      {groupedCommentsByPost.map(([postKey, commentList]) => {
        const post = posts?.find(
          (p) => `${p.postId}-${p.socialNetwork}` === postKey,
        );
        if (!post) return null;
        return (
          <div key={postKey} className="flex flex-col border rounded-xl">
            <div className="flex justify-between p-4 bg-indigo-50 rounded-t-xl">
              <div className="flex flex-col gap-2 items-start">
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
              </div>
              <div>
                <span className="border rounded-2xl px-1 text-indigo-600">
                  {getSocialNetworkName(post.socialNetwork)}
                </span>
              </div>
            </div>

            <div className="py-4 rounded-lg border  bg-neutral-50">
              {commentList?.map((comment, index) => (
                <div
                  key={comment.id}
                  className={cn(
                    "flex flex-col gap-4 px-4",
                    index < commentList.length - 1
                      ? "pb-4 mb-4 border-b"
                      : "border-b-0",
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
                        Score juridique : N/A
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full">
                    <div className="flex justify-between gap-2 w-full">
                      <img
                        src={buildDataUrl(
                          comment.screenshotData,
                          PNG_MIME_TYPE,
                        )}
                        alt="Capture d'écran du commentaire"
                        className="cursor-pointer h-full max-h-full! rounded-2xl border p-2 bg-white"
                        onClick={() =>
                          openScreenshotDialog(comment.screenshotData)
                        }
                      />
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground">
                          Publié le {formatCommentDate(comment.publishedAt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Capturé le{" "}
                          {new Date(post.latestAnalysisDate).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground self-start">
                    {" "}
                    Pseudo auteur : {comment.author.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <NoticeUtilisation />
    </div>
  );
};

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

// A mettre à jour en fonction du retour métier
const formatCommentDate = (publishedAt: PublicationDate): string => {
  switch (publishedAt.type) {
    case "absolute":
      return new Date(publishedAt.date).toLocaleDateString("fr-FR");
    case "relative":
      return formatRelativeDate(publishedAt);
    case "unknown date":
      return publishedAt.dateText;
  }
};

const formatRelativeDate = (relative: RelativeDate): string => {
  const start = new Date(relative.resolvedDateRange.start).getTime();
  const end = new Date(relative.resolvedDateRange.end).getTime();
  const mid = new Date(start + Math.round((end - start) / 2));
  return `~${mid.toLocaleDateString("fr-FR")}`;
};
