import { ReportQueryData } from "./BuildReport";
import { UserRound } from "lucide-react";

import KpiCard from "../Shared/KpiCards/KpiCard";

import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CategoryDistribution from "../Shared/CategoryDistribution";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard";
import PostSummary from "../Shared/PostSummary";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DisplayPublicationDate from "../Developer/DisplayPublicationDate";

import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { Post } from "@/shared/model/post/Post";
import { getEntriesGroupedByPostKey } from "@/shared/utils/report-data";
import SecurityAlert from "../Shared/KpiCards/SecurityAlert";

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
  const numberOfComments = posts?.flatMap((post) => post.comments).length ?? 0;

  const openScreenshotDialog = (screenshot: string) => {
    setSelectedScreenshot(screenshot);
    setScreenshotDialogOpen(true);
  };

  const groupedCommentsByPost = getEntriesGroupedByPostKey(
    reportQueryData?.postCommentList ?? [],
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        Rapport des commentaires malveillants
      </h1>
      <div className="flex">
        <div className="flex gap-4 justify-between">
          <NumberHatefulCommentsKpiCard
            numberOfHatefulComments={numberOfHatefulComments}
            numberOfComments={numberOfComments}
            isLoading={isLoadingPosts}
          />
          <PercentageHatefulCommentsKpiCard
            numberOfHatefulComments={numberOfHatefulComments}
            numberOfComments={numberOfComments}
            isLoading={isLoadingPosts}
          />
          <NumberHatefulAuhorsKpiCard
            hatefulCommentList={reportQueryData?.postCommentList ?? []}
            isLoading={isLoadingPosts}
          />
          <KpiCard
            title="Gravité"
            value="Modérée"
            isWorkInProgress={true}
            isLoading={isLoadingPosts}
          />
          <SecurityAlert isLoading={isLoadingPosts}></SecurityAlert>
        </div>
      </div>
      <div className="flex gap-6">
        <ActiveAuthors
          postComments={reportQueryData?.postCommentList ?? []}
          isLoading={isLoadingPosts}
        />
        <CategoryDistribution />
      </div>
      {groupedCommentsByPost.map(([postKey, commentList], index) => {
        const post = posts?.find(
          (p) => `${p.postId}-${p.socialNetwork}` === postKey,
        );
        if (!post) return null;
        return (
          <div key={postKey} className="flex flex-col gap-2">
            <Card className="p-5">
              <PostSummary post={post} />
            </Card>

            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-gray-200">
                  <TableRow>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Capture du commentaire</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commentList?.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell>
                        <div className="flex gap-2">
                          <UserRound className="bg-gray-200 rounded-full" />
                          {comment.author.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <img
                          src={buildDataUrl(
                            comment.screenshotData,
                            PNG_MIME_TYPE,
                          )}
                          alt="Capture d'écran du commentaire"
                          className="cursor-pointer h-full max-h-full!"
                          onClick={() =>
                            openScreenshotDialog(comment.screenshotData)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <DisplayPublicationDate date={comment.publishedAt} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <span className="self-start">
              {index + 1}/{reportQueryData?.postIdList.length} publications
            </span>
          </div>
        );
      })}
    </div>
  );
};
