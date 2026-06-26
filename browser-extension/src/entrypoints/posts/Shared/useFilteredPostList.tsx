import { Post } from "@/shared/model/post/Post";
import {
  DateFilterOptions,
  emptyPostFilters,
  filterPosts,
  PostFilters,
  PostSortingCategory,
  sortPostList,
} from "@/shared/utils/post-util";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
import { deletePost as deletePostFromStorage } from "@/shared/storage/post-snapshot-storage";

export type UseFilteredPostListData = {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  postFilters: PostFilters;
  setPostFilters: (postFilters: PostFilters) => void;
  filteredPosts: Post[];
  isLoading: boolean;
  deletePost: (post: Post) => Promise<void>;
};
/**
 * React hook for querying and filtering a post list
 * @param socialNetworkFilter
 * @returns
 */
export function useFilteredPostList(
  socialNetworkFilter: string[],
  postSortingCategory: PostSortingCategory,
): UseFilteredPostListData {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [postFilters, setPostFilters] = React.useState(emptyPostFilters);
  const queryClient = useQueryClient();
  const queryKey = ["postsSearchSocialNetworkAndPeriod", socialNetworkFilter, postFilters.date];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getPostsBySocialNetworkAndPeriod(
        socialNetworkFilter,
        getStartPeriodFromFilters(postFilters),
        getEndPeriodFromFilters(postFilters),
      ),
  });

  // Handle optimistic deletion for instant user feedback
  const [postsPendingDeletion, setPostsPendingDeletion] = React.useState<
    Set<string>
  >(new Set());

  const filteredPosts = React.useMemo(() => {
    if (!data || data.length === 0) {
      return data || [];
    }

    const notBeingDeleted = data.filter(
      (p) => !postsPendingDeletion.has(uniqueId(p)),
    );
    const filteredPostList: Post[] = filterPosts(
      notBeingDeleted,
      searchTerm,
      postFilters,
    );
    return sortPostList(filteredPostList, postSortingCategory);
  }, [
    data,
    postsPendingDeletion,
    searchTerm,
    postFilters,
    postSortingCategory,
  ]);

  const deletePost = async (post: Post): Promise<void> => {
    const postUniqueId = uniqueId(post);
    setPostsPendingDeletion((prev) => {
      return new Set([...prev, postUniqueId]);
    });

    try {
      await deletePostFromStorage(post.socialNetwork, post.postId);
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setPostsPendingDeletion((prev) => {
        const copy = new Set(prev);
        copy.delete(postUniqueId);
        return copy;
      });
    }
    return;
  };

  return {
    searchTerm,
    setSearchTerm,
    postFilters,
    setPostFilters,
    filteredPosts,
    isLoading,
    deletePost,
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

function uniqueId(post: Post): string {
  return post.socialNetwork + " - " + post.postId;
}
