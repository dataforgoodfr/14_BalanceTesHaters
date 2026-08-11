import {
  booleanToFrenchText,
  formatDateTimeForCsv,
  getPublicationDateRawRange,
  publicationDateSourceText,
  publicationDateToCsvText,
  publicationDateTypeToText,
} from "@/entrypoints/posts/Report/Exports/reportExportShared";
import type { Post } from "../model/post/Post";
import type { PostCommentWithId } from "./post-util";
import { getSocialNetworkName } from "./post-util";

export const POST_DETAIL_CSV_COLUMNS = [
  {
    key: "post_last_analysis_at",
    label: "Date de dernière collecte de la publication",
  },
  {
    key: "post_last_analysis_at_raw_utc",
    label: "Date de dernière collecte (UTC brut)",
  },
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

type PostDetailCsvColumnKey = (typeof POST_DETAIL_CSV_COLUMNS)[number]["key"];
export type PostDetailCsvRow = Record<PostDetailCsvColumnKey, string>;

export function buildPostCommentRow(
  post: Post | undefined,
  comment: PostCommentWithId,
): PostDetailCsvRow {
  const postRawDateRange = post
    ? getPublicationDateRawRange(post.publishedAt)
    : null;
  const commentRawDateRange = getPublicationDateRawRange(comment.publishedAt);

  return {
    post_last_analysis_at: post
      ? formatDateTimeForCsv(post.latestAnalysisDate)
      : "",
    post_last_analysis_at_raw_utc: post?.latestAnalysisDate ?? "",
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
}

export function escapeCsvCell(value: string): string {
  const startsWithFormulaTrigger = /^[=+\-@]/.test(value);
  const sanitizedValue = startsWithFormulaTrigger ? `'${value}` : value;

  if (/[;"\n\r]/.test(sanitizedValue)) {
    return `"${sanitizedValue.replaceAll('"', '""')}"`;
  }

  return sanitizedValue;
}
