import { Post } from "@/shared/model/post/Post";
import {
  DateFilterOptions,
  emptyPostFilters,
  filterPosts,
  PostFilters,
} from "@/shared/utils/post-util";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";

export type UseFilteredPostListData = {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  postFilters: PostFilters;
  setPostFilters: (postFilters: PostFilters) => void;
  filteredPosts: Post[];
  isLoading: boolean;
};
/**
 * React hook for querying and filtering a post list
 * @param socialNetworkFilter
 * @returns
 */
export function useFilteredPostList(
  socialNetworkFilter: string[],
): UseFilteredPostListData {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [postFilters, setPostFilters] = React.useState(emptyPostFilters);
  const queryKey = ["posts", socialNetworkFilter, postFilters.date];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getPostsBySocialNetworkAndPeriod(
        socialNetworkFilter,
        getStartPeriodFromFilters(postFilters),
        getEndPeriodFromFilters(postFilters),
      ),
  });

  const filteredPosts = React.useMemo(() => {
    if (!data || data.length === 0) {
      return data || [];
    }

    return filterPosts(data, searchTerm, postFilters);
  }, [data, searchTerm, postFilters]);
  return {
    searchTerm,
    setSearchTerm,
    postFilters,
    setPostFilters,
    filteredPosts,
    isLoading,
  };
}

function getStartPeriodFromFilters(filters: PostFilters): Date | undefined {
  if (filters.date === undefined) {
    return undefined;
  }

  // We take the longest chosen range
  const startDate = new Date();

  if (filters.date === DateFilterOptions.TWELVE_MONTHS) {
    startDate.setMonth(startDate.getMonth() - 12);
  } else if (filters.date === DateFilterOptions.THIRTY_DAYS) {
    startDate.setDate(startDate.getDate() - 30);
  } else if (filters.date === DateFilterOptions.SEVEN_DAYS) {
    startDate.setDate(startDate.getDate() - 7);
  } else {
    throw new Error("Unexpected");
  }
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

function getEndPeriodFromFilters(filters: PostFilters): Date | undefined {
  if (filters.date === DateFilterOptions.TWELVE_MONTHS) {
    return undefined;
  } else {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    return endDate;
  }
}
