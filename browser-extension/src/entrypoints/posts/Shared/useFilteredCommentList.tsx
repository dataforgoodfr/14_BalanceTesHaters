import type { PostCommentWithFlag } from "@/shared/model/post/Post";
import type {
  CommentFilters,
  CommentSortingCategory,
} from "@/shared/utils/post-util";
import {
  emptyCommentFilters,
  filterCommentList,
  sortCommentList,
} from "@/shared/utils/post-util";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostsByPostIdList } from "@/shared/storage/post-storage";
import { getPostHateFlagsList } from "@/shared/storage/hate-flags-storage";

export type useFilteredCommentListData = {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  commentFilters: CommentFilters;
  setCommentFilters: (commentFilters: CommentFilters) => void;
  allComments: PostCommentWithFlag[];
  filteredCommentList: PostCommentWithFlag[];
  hatefulAuthorList: string[];
  isLoading: boolean;
};
/**
 * React hook for querying and filtering a post list
 * @param socialNetworkFilter
 * @returns
 */
export function useFilteredCommentList(
  postIdList: string[],
  commentSortingCategory: CommentSortingCategory,
): useFilteredCommentListData {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [commentFilters, setCommentFilters] =
    React.useState(emptyCommentFilters);
  const postQueryKey = React.useMemo(
    () => ["posts", postIdList.join(",")],
    [postIdList],
  );
  const hateFlagsQueryKey = React.useMemo(
    () => ["postHateFlags", postIdList.join(",")],
    [postIdList],
  );

  const { data, isLoading: isLoadingPosts } = useQuery({
    queryKey: postQueryKey,
    queryFn: () => getPostsByPostIdList(postIdList),
  });

  const { data: allCommentsWithFlagData, isLoading: isLoadingFlags } = useQuery(
    {
      queryKey: hateFlagsQueryKey,
      queryFn: async () => {
        const allCommentsWithFlagData: PostCommentWithFlag[] = [];
        const hateFlags = await getPostHateFlagsList(postIdList);

        for (const post of data ?? []) {
          for (const comment of post.comments) {
            const flagsForPost = hateFlags.find(
              (flags) => flags.postId === post.postId,
            );
            const isFlagged =
              flagsForPost?.hateFlags[comment.commentRevisionId] ?? false;

            allCommentsWithFlagData.push({
              ...comment,

              isFlagged,
            });
          }
        }

        return allCommentsWithFlagData;
      },
      enabled: data !== undefined,
    },
  );

  const {
    filteredCommentList,
    hatefulAuthorList,
  }: {
    allComments: PostCommentWithFlag[];
    filteredCommentList: PostCommentWithFlag[];
    hatefulAuthorList: string[];
  } = React.useMemo(() => {
    const hatefulAuthorList: string[] = (allCommentsWithFlagData || [])
      .filter((comment) => comment.isFlagged)
      .map((comment) => comment.author.name);

    const filteredCommentList: PostCommentWithFlag[] = filterCommentList(
      allCommentsWithFlagData || [],
      searchTerm,
      commentFilters,
    );
    return {
      allComments: allCommentsWithFlagData || [],
      filteredCommentList: sortCommentList(
        filteredCommentList,
        commentSortingCategory,
      ),
      hatefulAuthorList,
    };
  }, [
    allCommentsWithFlagData,
    searchTerm,
    commentFilters,
    commentSortingCategory,
  ]);

  return {
    searchTerm,
    setSearchTerm,
    commentFilters,
    setCommentFilters,
    allComments: allCommentsWithFlagData || [],
    filteredCommentList,
    hatefulAuthorList,
    isLoading: isLoadingPosts || isLoadingFlags,
  };
}
