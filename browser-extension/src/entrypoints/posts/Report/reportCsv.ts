import { getSocialNetworkName } from "@/shared/utils/post-util";
import { Post } from "@/shared/model/post/Post";
import { ReportQueryData } from "./BuildReport";
import {
  booleanToFrenchText,
  formatDateTimeForCsv,
  getPublicationDateRawRange,
  publicationDateSourceText,
  publicationDateToCsvText,
  publicationDateTypeToText,
  reportOrganizationTypeToText,
} from "./reportExportShared";

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

export function buildReportCsv(
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
      post_published_at: post ? publicationDateToCsvText(post.publishedAt) : "",
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
      comment_published_at: publicationDateToCsvText(comment.publishedAt),
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

function escapeCsvCell(value: string): string {
  const startsWithFormulaTrigger = /^[=+\-@]/.test(value);
  const sanitizedValue = startsWithFormulaTrigger ? `'${value}` : value;

  if (/[;"\n\r]/.test(sanitizedValue)) {
    return `"${sanitizedValue.replaceAll('"', '""')}"`;
  }

  return sanitizedValue;
}
