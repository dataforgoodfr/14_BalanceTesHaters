import { PostCommentWithId } from "@/shared/utils/post-util";
import { Post } from "@/shared/model/post/Post";
import {
  buildPostCommentRow,
  escapeCsvCell,
  POST_DETAIL_CSV_COLUMNS,
} from "@/shared/utils/post-csv-util";

type PostDetailCsvColumnKey = (typeof POST_DETAIL_CSV_COLUMNS)[number]["key"];
type PostDetailCsvRow = Record<PostDetailCsvColumnKey, string>;

export function buildPostDetailCsv(
  post: Post,
  filteredCommentList: PostCommentWithId[],
): string {
  const rows = buildPostDetailCsvRows(post, filteredCommentList);
  const dataRows = rows.map((row) =>
    POST_DETAIL_CSV_COLUMNS.map((column) =>
      escapeCsvCell(row[column.key]),
    ).join(";"),
  );

  return [
    POST_DETAIL_CSV_COLUMNS.map((column) => column.label).join(";"),
    ...dataRows,
  ].join("\n");
}

function buildPostDetailCsvRows(
  post: Post,
  filteredCommentList: PostCommentWithId[],
): PostDetailCsvRow[] {
  return filteredCommentList.map((comment) => {
    return buildPostCommentRow(post, comment);
  });
}
