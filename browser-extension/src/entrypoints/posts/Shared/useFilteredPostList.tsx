import type { Post, PostWithFlags } from "@/shared/model/post/Post";
import type {
  PostFilters,
  PostSortingCategory,
} from "@/shared/utils/post-util";
import {
  DateFilterOptions,
  emptyPostFilters,
  filterPosts,
  sortPostList,
} from "@/shared/utils/post-util";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPostsBySocialNetworkAndPeriod } from "@/shared/storage/post-storage";
import { deletePost as deletePostFromStorage } from "@/shared/storage/post-snapshot-storage";
import { commentHateFlagKey, getPostHateFlagsList } from "@/shared/storage/hate-flags-storage";

export type UseFilteredPostListData = {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  postFilters: PostFilters;
  setPostFilters: (postFilters: PostFilters) => void;
  filteredPosts: PostWithFlags[];
  isLoading: boolean;
  deletePosts: (posts: Post[]) => Promise<void>;
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
  const queryKey = [
    "postsSearchSocialNetworkAndPeriod",
    socialNetworkFilter,
    postFilters.date,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getPostsBySocialNetworkAndPeriod(
        socialNetworkFilter,
        getStartPeriodFromFilters(postFilters),
        getEndPeriodFromFilters(postFilters),
      ),
  });

  const postIdList = React.useMemo(
    () => data?.map((p) => p.postId) ?? [],
    [data],
  );
  const hateFlagsQueryKey = React.useMemo(
    () => ["postHateFlags", postIdList.join(",")],
    [postIdList],
  );

  const {
    data: flaggedCommentIds = new Set<string>(),
    isLoading: isLoadingFlags,
  } = useQuery({
    queryKey: hateFlagsQueryKey,
    queryFn: async () => {
      const hateFlags = await getPostHateFlagsList(postIdList);
      const comments = (data ?? []).flatMap((post) =>
        post.comments.map((comment) => ({ postId: post.postId, comment })),
      );

      const flagResults = await Promise.all(
        comments.map(async ({ postId, comment }) => {
          const flagsForPost = hateFlags.find(
            (flags) => flags.postId === postId,
          );
          const key = await commentHateFlagKey(comment.textContent);
          return flagsForPost?.hateFlags[key] ?? false;
        }),
      );

      return new Set(
        flagResults.flatMap((isFlagged, index) =>
          isFlagged ? [String(index)] : [],
        ),
      );
    },
    enabled: data !== undefined,
  });

  // Handle optimistic deletion for instant user feedback
  const [postsPendingDeletion, setPostsPendingDeletion] = React.useState<
    Set<string>
  >(() => new Set());

  const filteredPosts = React.useMemo((): PostWithFlags[] => {
    if (!data || data.length === 0) {
      return [];
    }

    const postsWithFlags = addFlagsToPosts(data, flaggedCommentIds);
    const notBeingDeleted = postsWithFlags.filter(
      (p) => !postsPendingDeletion.has(uniqueId(p)),
    );
    const filteredPostList = filterPosts(
      notBeingDeleted,
      searchTerm,
      postFilters,
    );
    return sortPostList(filteredPostList, postSortingCategory);
  }, [
    data,
    flaggedCommentIds,
    postsPendingDeletion,
    searchTerm,
    postFilters,
    postSortingCategory,
  ]);

  const deletePosts = async (posts: Post[]): Promise<void> => {
    if (posts.length === 0) return;

    const postUniqueIds = posts.map(uniqueId);
    setPostsPendingDeletion((prev) => new Set([...prev, ...postUniqueIds]));

    try {
      await deletePostFromStorage(
        posts.map((post) => ({
          socialNetwork: post.socialNetwork,
          postId: post.postId,
        })),
      );
      await queryClient.invalidateQueries({ queryKey });
    } finally {
      setPostsPendingDeletion((prev) => {
        const copy = new Set(prev);
        postUniqueIds.forEach((id) => copy.delete(id));
        return copy;
      });
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    postFilters,
    setPostFilters,
    filteredPosts,
    isLoading: isLoading || isLoadingFlags,
    deletePosts,
  };
}

function addFlagsToPosts(
  posts: Post[],
  flaggedCommentIds: Set<string>,
): PostWithFlags[] {
  let commentIndex = 0;
  return posts.map((post) => ({
    ...post,
    comments: post.comments.map((comment) => {
      const id = commentIndex.toString();
      commentIndex += 1;
      return { ...comment, isFlagged: flaggedCommentIds.has(id) };
    }),
  }));
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
    // The storage filter uses a strict "before" comparison. Use tomorrow
    // as the exclusive upper bound so publications from today are included.
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(0, 0, 0, 0);
    return endDate;
  }
}

function uniqueId(post: Post): string {
  return post.socialNetwork + " - " + post.postId;
}
