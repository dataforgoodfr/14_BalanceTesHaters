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
import {
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  Paragraph,
} from "docx";
import { Post } from "@/shared/model/post/Post";
import { ReportOrganizationType } from "./BuildReport";

const REPORT_CSV_COLUMNS = [
  { key: "generated_at", label: "Date de génération du rapport" },
  { key: "generated_at_raw_utc", label: "Date de génération (UTC brut)" },
  {
    key: "post_last_analysis_at",
    label: "Date de dernière collecte de la publication",
  },
  {
    key: "post_last_analysis_at_raw_utc",
    label: "Date de dernière collecte (UTC brut)",
  },
  { key: "report_organization", label: "Organisation du rapport" },
  { key: "report_organization_code", label: "Organisation du rapport (code)" },
  { key: "social_network", label: "Plateforme" },
  { key: "social_network_code", label: "Plateforme (code)" },
  { key: "post_id", label: "Identifiant de la publication" },
  { key: "post_url", label: "URL de la publication" },
  { key: "post_title", label: "Titre de la publication" },
  { key: "post_author", label: "Auteur de la publication" },
  { key: "post_published_at", label: "Date de publication" },
  {
    key: "post_published_at_source_text",
    label: "Date de publication (texte source plateforme)",
  },
  { key: "post_published_at_type", label: "Type de date de publication" },
  {
    key: "post_published_at_raw_start_utc",
    label: "Date publication brute début (UTC)",
  },
  {
    key: "post_published_at_raw_end_utc",
    label: "Date publication brute fin (UTC)",
  },
  { key: "comment_id", label: "Identifiant du commentaire" },
  { key: "comment_author", label: "Auteur du commentaire" },
  { key: "comment_published_at", label: "Date du commentaire" },
  {
    key: "comment_published_at_source_text",
    label: "Date du commentaire (texte source plateforme)",
  },
  { key: "comment_published_at_type", label: "Type de date du commentaire" },
  {
    key: "comment_published_at_raw_start_utc",
    label: "Date commentaire brute début (UTC)",
  },
  {
    key: "comment_published_at_raw_end_utc",
    label: "Date commentaire brute fin (UTC)",
  },
  { key: "comment_text", label: "Commentaire" },
  {
    key: "comment_classification",
    label: "Catégorie(s) de cyberharcèlement détectée(s)",
  },
  {
    key: "comment_classification_raw",
    label: "Catégorie(s) détectée(s) (brut)",
  },
  {
    key: "comment_classified_at",
    label: "Date de classification du commentaire",
  },
  {
    key: "comment_classified_at_raw_utc",
    label: "Date de classification (UTC brut)",
  },
  {
    key: "comment_screenshot_available",
    label: "Capture d'écran disponible",
  },
  { key: "comment_is_deleted", label: "Commentaire supprimé" },
  { key: "comment_is_new", label: "Commentaire nouveau" },
] as const;

type ReportCsvColumnKey = (typeof REPORT_CSV_COLUMNS)[number]["key"];
type ReportCsvRow = Record<ReportCsvColumnKey, string>;

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
  const canExportDocx = canExportCsv;

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

  const exportDocx = async () => {
    if (!reportQueryData) {
      return;
    }
    const generatedAt = new Date().toISOString().replace(/[:.]/g, "-");
    const docxDocument = buildReportDocx(reportQueryData, data ?? []);
    const blob = await Packer.toBlob(docxDocument);
    const objectUrl = URL.createObjectURL(blob);

    try {
      await browser.downloads.download({
        url: objectUrl,
        filename: `rapport-bth-${generatedAt}.docx`,
        saveAs: true,
      });
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
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
          <Button
            variant="outline"
            disabled={!canExportDocx}
            onClick={() => void exportDocx()}
          >
            Télécharger le DOCX
          </Button>
        </div>
      </div>
      <div className="flex justify-center items-end text-gray-500">
        <TriangleAlert className="me-2" />
        <span>
          Ce rapport ne pourra pas être enregistré sur votre navigateur. Pensez
          à télécharger le rapport en DOCX ou exporter les données du rapport en
          CSV.
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
    REPORT_CSV_COLUMNS.map((column) => escapeCsvCell(row[column.key])).join(
      ";",
    ),
  );
  return [
    REPORT_CSV_COLUMNS.map((column) => column.label).join(";"),
    ...dataRows,
  ].join("\n");
}

function buildReportDocx(
  reportQueryData: ReportQueryData,
  posts: Post[],
): DocxDocument {
  const postsByKey = new Map<string, Post>(
    posts.map((post) => [`${post.postId}-${post.socialNetwork}`, post]),
  );
  const generatedAt = new Date().toISOString();
  const groupedCommentsByPost = Object.entries(
    Object.groupBy(
      reportQueryData.postCommentList,
      (comment) => comment.postKey,
    ),
  );

  const children: Paragraph[] = [
    new Paragraph({
      text: "Rapport des commentaires malveillants",
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      text: `Généré le : ${formatDateTimeForCsv(generatedAt)}`,
    }),
    new Paragraph({
      text: `Organisation : ${reportOrganizationTypeToText(reportQueryData.reportOrganizationType)}`,
    }),
    new Paragraph({
      text: `Plateformes : ${reportQueryData.socialNetworkList
        .map((socialNetworkName) =>
          getSocialNetworkName(socialNetworkName as SocialNetworkName),
        )
        .join(", ")}`,
    }),
    new Paragraph({
      text: `Publications analysées : ${reportQueryData.postIdList.length}`,
    }),
    new Paragraph({
      text: `Commentaires retenus : ${reportQueryData.postCommentList.length}`,
    }),
    new Paragraph({ text: "" }),
  ];

  groupedCommentsByPost.forEach(([postKey, commentList], postIndex) => {
    const post = postsByKey.get(postKey);
    const comments = commentList ?? [];

    children.push(
      new Paragraph({
        text: `Publication ${postIndex + 1}`,
        heading: HeadingLevel.HEADING_1,
      }),
    );

    if (post) {
      children.push(
        new Paragraph({ text: `Titre : ${post.title ?? "-"}` }),
        new Paragraph({ text: `Auteur : ${post.author.name}` }),
        new Paragraph({
          text: `Plateforme : ${getSocialNetworkName(post.socialNetwork)}`,
        }),
        new Paragraph({ text: `URL : ${post.url}` }),
        new Paragraph({
          text: `Date de publication : ${publicationDateToText(post.publishedAt)}`,
        }),
      );
    } else {
      children.push(
        new Paragraph({
          text: `Publication introuvable pour la clé : ${postKey}`,
        }),
      );
    }

    children.push(
      new Paragraph({
        text: `Nombre de commentaires retenus : ${comments.length}`,
      }),
      new Paragraph({ text: "" }),
    );

    comments.forEach((comment, commentIndex) => {
      children.push(
        new Paragraph({
          text: `Commentaire ${commentIndex + 1}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: `ID : ${comment.id}` }),
        new Paragraph({ text: `Auteur : ${comment.author.name}` }),
        new Paragraph({
          text: `Date : ${publicationDateToText(comment.publishedAt)}`,
        }),
        new Paragraph({
          text: `Classification : ${(comment.classification ?? []).join(", ") || "-"}`,
        }),
        new Paragraph({
          text: `Capture disponible : ${booleanToFrenchText(Boolean(comment.screenshotData))}`,
        }),
        new Paragraph({ text: "Texte :" }),
        new Paragraph({
          text: comment.textContent || "(commentaire vide)",
        }),
        new Paragraph({ text: "" }),
      );
    });
  });

  return new DocxDocument({
    sections: [
      {
        children,
      },
    ],
  });
}

function buildReportCsvRows(
  reportQueryData: ReportQueryData,
  posts: Post[],
): ReportCsvRow[] {
  const postsByKey = new Map<string, Post>(
    posts.map((post) => [`${post.postId}-${post.socialNetwork}`, post]),
  );
  const generatedAtRawUtc = new Date().toISOString();
  const generatedAt = formatDateTimeForCsv(generatedAtRawUtc);

  return reportQueryData.postCommentList.map((comment) => {
    const post = postsByKey.get(comment.postKey);
    const postRawDateRange = post
      ? getPublicationDateRawRange(post.publishedAt)
      : null;
    const commentRawDateRange = getPublicationDateRawRange(comment.publishedAt);
    return {
      generated_at: generatedAt,
      generated_at_raw_utc: generatedAtRawUtc,
      post_last_analysis_at: post
        ? formatDateTimeForCsv(post.lastAnalysisDate)
        : "",
      post_last_analysis_at_raw_utc: post?.lastAnalysisDate ?? "",
      report_organization: reportOrganizationTypeToText(
        reportQueryData.reportOrganizationType,
      ),
      report_organization_code: reportQueryData.reportOrganizationType,
      social_network: post ? getSocialNetworkName(post.socialNetwork) : "",
      social_network_code: post?.socialNetwork ?? "",
      post_id: post?.postId ?? "",
      post_url: post?.url ?? "",
      post_title: post?.title ?? "",
      post_author: post?.author.name ?? "",
      post_published_at: post ? publicationDateToText(post.publishedAt) : "",
      post_published_at_source_text: post
        ? publicationDateSourceText(post.publishedAt)
        : "",
      post_published_at_type: post
        ? publicationDateTypeToText(post.publishedAt.type)
        : "",
      post_published_at_raw_start_utc: postRawDateRange?.start ?? "",
      post_published_at_raw_end_utc: postRawDateRange?.end ?? "",
      comment_id: comment.id,
      comment_author: comment.author.name,
      comment_published_at: publicationDateToText(comment.publishedAt),
      comment_published_at_source_text: publicationDateSourceText(
        comment.publishedAt,
      ),
      comment_published_at_type: publicationDateTypeToText(
        comment.publishedAt.type,
      ),
      comment_published_at_raw_start_utc: commentRawDateRange.start,
      comment_published_at_raw_end_utc: commentRawDateRange.end,
      comment_text: comment.textContent,
      comment_classification: (comment.classification ?? []).join(", "),
      comment_classification_raw: JSON.stringify(comment.classification ?? []),
      comment_classified_at: comment.classifiedAt
        ? formatDateTimeForCsv(comment.classifiedAt)
        : "",
      comment_classified_at_raw_utc: comment.classifiedAt ?? "",
      comment_screenshot_available: booleanToFrenchText(
        Boolean(comment.screenshotData),
      ),
      comment_is_deleted: booleanToFrenchText(comment.isDeleted),
      comment_is_new: booleanToFrenchText(comment.isNew),
    };
  });
}

function reportOrganizationTypeToText(type: ReportOrganizationType): string {
  switch (type) {
    case ReportOrganizationType.BY_PUBLICATION:
      return "Par publication";
    case ReportOrganizationType.BY_AUTHOR:
      return "Par auteur";
  }
}

function booleanToFrenchText(value: boolean): string {
  return value ? "Oui" : "Non";
}

function publicationDateTypeToText(type: Post["publishedAt"]["type"]): string {
  switch (type) {
    case "absolute":
      return "Date absolue";
    case "relative":
      return "Date relative";
    case "unknown date":
      return "Date inconnue";
  }
}

function publicationDateToText(date: Post["publishedAt"]): string {
  switch (date.type) {
    case "absolute":
      return formatDateTimeForCsv(date.date, { dateOnlyIfMidnightUtc: true });
    case "relative":
      return `${date.dateText} (estimé entre ${formatDateTimeForCsv(date.resolvedDateRange.start)} et ${formatDateTimeForCsv(date.resolvedDateRange.end)})`;
    case "unknown date":
      return date.dateText;
  }
}

function publicationDateSourceText(date: Post["publishedAt"]): string {
  switch (date.type) {
    case "absolute":
      return date.date;
    case "relative":
      return date.dateText;
    case "unknown date":
      return date.dateText;
  }
}

function formatDateTimeForCsv(
  value: string,
  options?: { dateOnlyIfMidnightUtc?: boolean },
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const isMidnightUtc =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (options?.dateOnlyIfMidnightUtc && isMidnightUtc) {
    return `UTC ${date.toISOString().slice(0, 10)}`;
  }

  return `UTC ${date.toISOString().slice(0, 19).replace("T", " ")}`;
}

function getPublicationDateRawRange(date: Post["publishedAt"]): {
  start: string;
  end: string;
} {
  switch (date.type) {
    case "absolute":
      return { start: date.date, end: date.date };
    case "relative":
      return {
        start: date.resolvedDateRange.start,
        end: date.resolvedDateRange.end,
      };
    case "unknown date":
      return { start: "", end: "" };
  }
}

function escapeCsvCell(value: string): string {
  const startsWithFormulaTrigger = /^[=+\-@]/.test(value);
  const sanitizedValue = startsWithFormulaTrigger ? `'${value}` : value;

  if (/[;"\n\r]/.test(sanitizedValue)) {
    return `"${sanitizedValue.replaceAll('"', '""')}"`;
  }
  return sanitizedValue;
}

export default Report;
