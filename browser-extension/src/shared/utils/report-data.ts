import { useQuery } from "@tanstack/react-query";
import { getPostsByPostIdList } from "@/shared/storage/post-storage";

export const REPORT_PDF_FILE_NAME = "rapport-commentaires-malveillants.pdf";

type HasPostKey = {
  postKey: string;
};

export const getEntriesGroupedByPostKey = <T extends HasPostKey>(
  items: readonly T[],
) => Object.entries(Object.groupBy(items, (item) => item.postKey));

export const getReportPostsQueryKey = (postIdList?: readonly string[]) =>
  ["report-posts", postIdList ?? []] as const;

export const useReportPosts = (postIdList?: readonly string[]) =>
  useQuery({
    queryKey: getReportPostsQueryKey(postIdList),
    queryFn: () => getPostsByPostIdList([...(postIdList ?? [])]),
    enabled: Boolean(postIdList?.length),
  });
