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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Post } from "@/shared/model/post/Post";

const REPORT_CSV_HEADERS = [
  "generated_at",
  "report_organization",
  "social_network",
  "post_id",
  "post_url",
  "post_title",
  "post_author",
  "post_published_at_type",
  "post_published_at",
  "comment_id",
  "comment_author",
  "comment_text",
  "comment_published_at_type",
  "comment_published_at",
  "comment_classification",
  "comment_is_new",
  "comment_is_deleted",
  "comment_screenshot_available",
] as const;

type ReportCsvRow = Record<(typeof REPORT_CSV_HEADERS)[number], string>;

function Report({
  reportQueryData,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
}>) {
  const [screenshotDialogOpen, setScreenshotDialogOpen] = React.useState(false);

  const [selectedScreenshot, setSelectedScreenshot] = React.useState<
    string | null
  >(null);

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
    const comments = reportQueryData?.postCommentList || [];

    return Object.entries(
      Object.groupBy(comments, (comment) => comment.postKey),
    );
  }, [reportQueryData?.postCommentList]);

  const canExportCsv =
    !isLoading && (reportQueryData?.postCommentList.length ?? 0) > 0;

  const exportCsv = () => {
    if (!reportQueryData) {
      return;
    }
    const csvContent = buildReportCsv(reportQueryData, data ?? []);
    const generatedAt = new Date().toISOString().replace(/[:.]/g, "-");

    void browser.downloads.download({
      url:
        "data:text/csv;charset=utf-8," +
        encodeURIComponent("\uFEFF" + csvContent),
      filename: `rapport-bth-${generatedAt}.csv`,
      saveAs: true,
    });
  };

  return (
    <>
      <div className="flex justify-between">
        <Button
          variant="link"
          nativeButton={false}
          render={
            <Link to="/">
              <MoveLeft /> Revenir à la vue d&apos;ensemble
            </Link>
          }
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!canExportCsv}
            onClick={exportCsv}
          >
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
              alt="Capture d'écran du commentaire"
              className="max-w-fit max-h-fit"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildReportCsv(
  reportQueryData: ReportQueryData,
  posts: Post[],
): string {
  const rows = buildReportCsvRows(reportQueryData, posts);
  const dataRows = rows.map((row) =>
    REPORT_CSV_HEADERS.map((header) => escapeCsvCell(row[header])).join(";"),
  );
  return [REPORT_CSV_HEADERS.join(";"), ...dataRows].join("\n");
}

function buildReportCsvRows(
  reportQueryData: ReportQueryData,
  posts: Post[],
): ReportCsvRow[] {
  const postsByKey = new Map<string, Post>(
    posts.map((post) => [`${post.postId}-${post.socialNetwork}`, post]),
  );
  const generatedAt = new Date().toISOString();

  return reportQueryData.postCommentList.map((comment) => {
    const post = postsByKey.get(comment.postKey);
    return {
      generated_at: generatedAt,
      report_organization: reportQueryData.reportOrganizationType,
      social_network: post?.socialNetwork ?? "",
      post_id: post?.postId ?? "",
      post_url: post?.url ?? "",
      post_title: post?.title ?? "",
      post_author: post?.author.name ?? "",
      post_published_at_type: post?.publishedAt.type ?? "",
      post_published_at: post ? publicationDateToText(post.publishedAt) : "",
      comment_id: comment.id,
      comment_author: comment.author.name,
      comment_text: comment.textContent,
      comment_published_at_type: comment.publishedAt.type,
      comment_published_at: publicationDateToText(comment.publishedAt),
      comment_classification: (comment.classification ?? []).join("|"),
      comment_is_new: String(comment.isNew),
      comment_is_deleted: String(comment.isDeleted),
      comment_screenshot_available: String(Boolean(comment.screenshotData)),
    };
  });
}

function publicationDateToText(date: Post["publishedAt"]): string {
  switch (date.type) {
    case "absolute":
      return date.date;
    case "relative":
      return `${date.dateText} (${date.resolvedDateRange.start} -> ${date.resolvedDateRange.end})`;
    case "unknown date":
      return date.dateText;
  }
}

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export default Report;
