import { Post } from "@/shared/model/post/Post";
import { ReportQueryData } from "../Stepper/BuildReport";
import {
  formatDateTimeForCsv,
  reportOrganizationTypeToText,
} from "./reportExportShared";
import {
  buildPostCommentRow,
  escapeCsvCell,
  POST_DETAIL_CSV_COLUMNS,
} from "@/shared/utils/post-csv-util";

const REPORT_CSV_COLUMNS = [
  { key: "generated_at", label: "Date de génération du rapport" },
  { key: "generated_at_raw_utc", label: "Date de génération (UTC brut)" },
  { key: "report_organization", label: "Organisation du rapport" },
  { key: "report_organization_code", label: "Organisation du rapport (code)" },
  ...POST_DETAIL_CSV_COLUMNS,
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
    console.log("post", post);
    return {
      generated_at: generatedAt,
      generated_at_raw_utc: generatedAtRawUtc,
      report_organization: reportOrganizationTypeToText(
        reportQueryData.reportOrganizationType,
      ),
      report_organization_code: reportQueryData.reportOrganizationType,
      ...buildPostCommentRow(post, comment),
    } as ReportCsvRow;
  });
}
