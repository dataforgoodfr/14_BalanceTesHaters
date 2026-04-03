import { PublicationDate } from "@/shared/model/PublicationDate";
import { PublicationDateTextParsing } from "@/shared/utils/date-text-parsing";

export function parseCommentPublishedTime(
  commentPublishedTimeText: string,
  baseDate = new Date(),
): PublicationDate {
  const withoutModifiedSuffix = commentPublishedTimeText
    .replaceAll(" (edited)", "")
    .replaceAll(" (modifié)", "");

  return new PublicationDateTextParsing(
    withoutModifiedSuffix,
    baseDate,
  ).parse();
}
