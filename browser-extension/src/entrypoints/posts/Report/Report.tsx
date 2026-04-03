import { Link } from "react-router";
import { MoveLeft, TriangleAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatAnalysisDate,
  getSocialNetworkName,
} from "@/shared/utils/post-util";
import { ReportQueryData } from "./BuildReport";
import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import KpiCard from "../Shared/KpiCards/KpiCard";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostsByPostIdList } from "@/shared/storage/post-storage";
import NumberHatefulAuhorsKpiCard from "../Shared/KpiCards/NumberHatefulAuhorsKpiCard";
import ActiveAuthors from "../Shared/ActiveAuthors";
import CategoryDistribution from "../Shared/CategoryDistribution";
import PercentageHatefulCommentsKpiCard from "../Shared/KpiCards/PercentageHatefulCommentsKpiCard";
import NumberHatefulCommentsKpiCard from "../Shared/KpiCards/NumberHatefulCommentsKpiCard copy";
import { PostCommentWithId } from "../Posts/CommentsTable";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Report({
  reportQueryData,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
}>) {
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);

  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null,
  );

  const queryKey = React.useMemo(
    () => ["posts", reportQueryData?.socialNetworkList?.join(",") ?? ""],
    [reportQueryData?.socialNetworkList?.join(",")],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPostsByPostIdList(reportQueryData?.postIdList ?? []),
  });

  const numberOfHatefulComments = reportQueryData?.postCommentList?.length ?? 0;
  const numberOfComments = data?.flatMap((p) => p.comments).length ?? 0;

  const openScreenshotDialog = (screenshot: string) => {
    setSelectedScreenshot(screenshot);
    setScreenshotDialogOpen(true);
  };

  const groupedCommentsByPost = React.useMemo(() => {
    const comments = reportQueryData?.postCommentList;
    if (!comments || comments.length === 0)
      return [] as [string, PostCommentWithId[]][];
    if (typeof Object.groupBy === "function") {
      return Object.entries(
        Object.groupBy(comments, (comment) => comment.postKey),
      );
    }
    const groups: Record<string, PostCommentWithId[]> = {};
    for (const comment of comments) {
      (groups[comment.postKey] ??= []).push(comment);
    }
    return Object.entries(groups);
  }, [reportQueryData?.postCommentList]);

  return (
    <>
      <div className="flex justify-between">
        <Button
          variant="link"
          render={
            <Link to="/">
              <MoveLeft /> Revenir à la vue d&apos;ensemble
            </Link>
          }
        />
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            Exporter les données en CSV
          </Button>
          <Button variant="outline" disabled>
            Télécharger le PDF
          </Button>
        </div>
      </div>
      <div className="flex justify-center items-end text-gray-500">
        <TriangleAlert className="me-2" />
        <span>
          Ce rapport ne pourra pas être enregistré sur votre navigateur. Pensez
          à télécharger le rapport en PDF ou exporter les données su rapport en
          CSV
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span>
          Généré le :{" "}
          <span className="font-bold">
            {formatAnalysisDate(new Date().toISOString())}
          </span>
        </span>
        <span>
          Publications analysées :{" "}
          <span className="font-bold">
            {reportQueryData?.postIdList.length}
          </span>
        </span>
        <span>
          Plateforme :{" "}
          <span className="font-bold">
            {reportQueryData?.socialNetworkList
              .map((socialNetworkName) =>
                getSocialNetworkName(socialNetworkName as SocialNetworkName),
              )
              .join(", ")}
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">
          Rapport des commentaires malveillants
        </h1>
        <div className="flex">
          <div className="flex gap-4 justify-between">
            <NumberHatefulCommentsKpiCard
              numberOfHatefulComments={numberOfHatefulComments}
              numberOfComments={numberOfComments}
              isLoading={isLoading}
            />
            <PercentageHatefulCommentsKpiCard
              numberOfHatefulComments={numberOfHatefulComments}
              numberOfComments={numberOfComments}
              isLoading={isLoading}
            />
            <NumberHatefulAuhorsKpiCard
              hatefulCommentList={reportQueryData?.postCommentList ?? []}
              isLoading={isLoading}
            />
            <KpiCard
              title="Gravité"
              value="Modérée"
              isWorkInProgress={true}
              isLoading={isLoading}
            ></KpiCard>
          </div>
        </div>
        <div className="flex gap-6">
          <ActiveAuthors
            postComments={reportQueryData?.postCommentList ?? []}
            isLoading={isLoading}
          />
          <CategoryDistribution />
        </div>
        {groupedCommentsByPost.map(([postKey, commentList], index) => {
          const post = data?.find(
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
                            alt="Screenshot"
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

      {/* Screenshot Dialog */}
      <Dialog
        open={screenshotDialogOpen}
        onOpenChange={setScreenshotDialogOpen}
      >
        <DialogContent className="max-w-fit!">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <img
              src={buildDataUrl(selectedScreenshot, PNG_MIME_TYPE)}
              alt="Screenshot"
              className="max-w-fit max-h-fit"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Report;
