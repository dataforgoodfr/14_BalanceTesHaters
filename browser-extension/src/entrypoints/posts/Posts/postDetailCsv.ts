import { getSocialNetworkName, PostCommentWithId } from "@/shared/utils/post-util";
import { Post } from "@/shared/model/post/Post";
import {
  booleanToFrenchText,
  formatDateTimeForCsv,
  getPublicationDateRawRange,
  publicationDateSourceText,
  publicationDateToCsvText,
  publicationDateTypeToText,
} from "../Report/Exports/reportExportShared";
import { POST_DETAIL_CSV_COLUMNS } from "@/shared/utils/csv-util";

type PostDetailCsvColumnKey = (typeof POST_DETAIL_CSV_COLUMNS)[number]["key"];
type PostDetailCsvRow = Record<PostDetailCsvColumnKey, string>;

export function buildPostDetailCsv(
  post: Post,
  filteredCommentList: PostCommentWithId[]
): string {
  const rows = buildPostDetailCsvRows(post, filteredCommentList);
  const dataRows = rows.map((row) =>
    POST_DETAIL_CSV_COLUMNS.map((column) => escapeCsvCell(row[column.key])).join(
      ";",
    ),
  );

  return [
    POST_DETAIL_CSV_COLUMNS.map((column) => column.label).join(";"),
    ...dataRows,
  ].join("\n");
}

function buildPostDetailCsvRows(
  post: Post,
  filteredCommentList: PostCommentWithId[]
): PostDetailCsvRow[] {
  const generatedAtRawUtc = new Date().toISOString();
  const generatedAt = formatDateTimeForCsv(generatedAtRawUtc);

  return filteredCommentList.map((comment) => {
    const postRawDateRange = post
      ? getPublicationDateRawRange(post.publishedAt)
      : null;
    const commentRawDateRange = getPublicationDateRawRange(comment.publishedAt);

    return {
      generated_at: generatedAt,
      generated_at_raw_utc: generatedAtRawUtc,
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
