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
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table as DocxTable,
  TableCell as DocxTableCell,
  TableRow as DocxTableRow,
  TextRun,
  WidthType,
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
          <Button variant="outline" disabled>
            Télécharger le PDF
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

  const children: Array<Paragraph | DocxTable> = [
    new Paragraph({
      text: "Rapport des commentaires malveillants",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: "Document généré automatiquement par l'extension Balance tes haters.",
        }),
      ],
    }),
    createKeyValueTable([
      ["Date de génération", formatDateTimeForDocx(generatedAt)],
      ["Date de génération (UTC brut)", generatedAt],
      [
        "Organisation du rapport",
        reportOrganizationTypeToText(reportQueryData.reportOrganizationType),
      ],
      [
        "Plateformes",
        reportQueryData.socialNetworkList
          .map((socialNetworkName) =>
            getSocialNetworkName(socialNetworkName as SocialNetworkName),
          )
          .join(", "),
      ],
      ["Publications analysées", String(reportQueryData.postIdList.length)],
      ["Commentaires retenus", String(reportQueryData.postCommentList.length)],
    ]),
    new Paragraph({
      spacing: { before: 240, after: 240 },
      children: [
        new TextRun({
          text: "Note: les dates affichées dans ce document sont formatées en français avec fuseau horaire explicite.",
        }),
      ],
    }),
  ];

  groupedCommentsByPost.forEach(([postKey, commentList], postIndex) => {
    const post = postsByKey.get(postKey);
    const comments = commentList ?? [];

    children.push(
      new Paragraph({
        text: `Publication ${postIndex + 1}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: postIndex > 0,
        spacing: { before: 240, after: 120 },
      }),
    );

    if (post) {
      children.push(
        createKeyValueTable([
          ["Titre", post.title ?? "-"],
          ["Auteur", post.author.name],
          ["Plateforme", getSocialNetworkName(post.socialNetwork)],
          ["Identifiant publication", post.postId],
          ["URL", post.url],
          ["Date de publication", publicationDateToDocxText(post.publishedAt)],
          [
            "Date source plateforme",
            publicationDateSourceText(post.publishedAt),
          ],
          ["Dernière collecte", formatDateTimeForDocx(post.lastAnalysisDate)],
          ["Dernière collecte (UTC brut)", post.lastAnalysisDate],
        ]),
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
        spacing: { before: 180, after: 180 },
      }),
    );

    if (comments.length === 0) {
      children.push(
        new Paragraph({
          text: "Aucun commentaire retenu pour cette publication.",
          spacing: { after: 180 },
        }),
      );
      return;
    }

    comments.forEach((comment, commentIndex) => {
      children.push(
        new Paragraph({
          text: `Commentaire ${commentIndex + 1}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 120 },
        }),
        createKeyValueTable([
          ["ID", comment.id],
          ["Auteur", comment.author.name],
          ["Date", publicationDateToDocxText(comment.publishedAt)],
          [
            "Date source plateforme",
            publicationDateSourceText(comment.publishedAt),
          ],
          ["Classification", (comment.classification ?? []).join(", ") || "-"],
          [
            "Date de classification",
            comment.classifiedAt
              ? formatDateTimeForDocx(comment.classifiedAt)
              : "-",
          ],
          [
            "Capture d'écran disponible",
            booleanToFrenchText(Boolean(comment.screenshotData)),
          ],
          ["Commentaire supprimé", booleanToFrenchText(comment.isDeleted)],
          ["Commentaire nouveau", booleanToFrenchText(comment.isNew)],
        ]),
        new Paragraph({
          children: [
            new TextRun({
              text: "Capture d'écran du commentaire",
              bold: true,
            }),
          ],
          spacing: { before: 120, after: 80 },
        }),
      );

      const screenshotParagraphs = createCommentScreenshotParagraphs(
        comment.screenshotData,
      );
      screenshotParagraphs.forEach((paragraph) => {
        children.push(paragraph);
      });

      children.push(
        new Paragraph({
          thematicBreak: true,
          spacing: { before: 120, after: 120 },
        }),
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

function createKeyValueTable(rows: Array<[string, string]>): DocxTable {
  return new DocxTable({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new DocxTableRow({
          children: [
            new DocxTableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true })],
                }),
              ],
            }),
            new DocxTableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: value || "-" })],
            }),
          ],
        }),
    ),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    },
  });
}

function createCommentScreenshotParagraphs(
  screenshotData: string,
): Paragraph[] {
  if (!screenshotData) {
    return [
      new Paragraph({
        text: "Capture non disponible.",
      }),
    ];
  }

  try {
    const bytes = base64ToUint8Array(screenshotData);
    const dimensions = getPngDimensions(bytes);
    const transformation = computeImageTransformation(dimensions);

    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: bytes,
            type: "png",
            transformation,
          }),
        ],
      }),
    ];
  } catch {
    return [
      new Paragraph({
        text: "Capture non disponible (format invalide).",
      }),
    ];
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getPngDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} | null {
  if (bytes.length < 24) {
    return null;
  }

  const pngSignatureMatches =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  if (!pngSignatureMatches) {
    return null;
  }

  const width =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function computeImageTransformation(
  dimensions: {
    width: number;
    height: number;
  } | null,
): {
  width: number;
  height: number;
} {
  // Match table/text visual footprint in DOCX to keep screenshots readable.
  const maxWidth = 600;
  const maxHeight = 900;

  if (!dimensions) {
    return { width: maxWidth, height: 380 };
  }

  const widthScale = maxWidth / dimensions.width;
  const heightScale = maxHeight / dimensions.height;
  const scale = Math.min(widthScale, heightScale, 1);

  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
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

function publicationDateToDocxText(date: Post["publishedAt"]): string {
  switch (date.type) {
    case "absolute":
      return formatDateTimeForDocx(date.date);
    case "relative":
      return `${date.dateText} (estimé entre ${formatDateTimeForDocx(date.resolvedDateRange.start)} et ${formatDateTimeForDocx(date.resolvedDateRange.end)})`;
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

function formatDateTimeForDocx(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  // Use explicit fields for better browser compatibility than dateStyle/timeStyle
  // mixed with timeZoneName.
  return `${new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(date)} UTC`;
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
