import type { PostWithFlags } from "@/shared/model/post/Post";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
import type { DateRange } from "@daypicker/react";
import { useQuery } from "@tanstack/react-query";
import { usePostsWithFlags } from "./usePostsWithFlags";

export type UseHomePagePostListData = {
  filteredPosts: PostWithFlags[];
  isLoading: boolean;
};

export function useHomePagePostList(
  socialNetworkFilter: string[],
  dateRange: DateRange | undefined,
): UseHomePagePostListData {
  const queryKey = [
    "HomePagePostList",
    socialNetworkFilter,
    dateRange?.from?.toISOString() ?? "",
    dateRange?.to?.toISOString() ?? "",
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getPostsBySocialNetworkAndPeriod(
        socialNetworkFilter,
        dateRange?.from,
        dateRange?.to,
      ),
  });
  const { postsWithFlags, isLoading: isLoadingFlags } = usePostsWithFlags(data);

  return {
    filteredPosts: postsWithFlags,
    isLoading: isLoading || isLoadingFlags,
  };
}
