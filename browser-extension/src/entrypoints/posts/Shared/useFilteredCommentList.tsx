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
import { usePostHateFlagsList } from "./usePostHateFlagsList";

export type useFilteredCommentListData = {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  commentFilters: CommentFilters;
  setCommentFilters: (commentFilters: CommentFilters) => void;
  allComments: PostCommentWithFlag[];
  filteredCommentList: PostCommentWithFlag[];
  authorList: string[];
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

  const { data, isLoading: isLoadingPosts } = useQuery({
    queryKey: postQueryKey,
    queryFn: () => getPostsByPostIdList(postIdList),
  });

  const { data: hateFlags = [], isLoading: isLoadingFlags } =
    usePostHateFlagsList(postIdList, data !== undefined);

  const allCommentsWithFlagData = React.useMemo(
    (): PostCommentWithFlag[] =>
      (data ?? []).flatMap((post) => {
        const flagsForPost = hateFlags.find(
          (flags) => flags.postId === post.postId,
        );
        return post.comments.map((comment) => ({
          ...comment,
          isFlagged:
            flagsForPost?.hateFlags[comment.commentRevisionId] ?? false,
        }));
      }),
    [data, hateFlags],
  );

  const {
    filteredCommentList,
    authorList,
  }: {
    allComments: PostCommentWithFlag[];
    filteredCommentList: PostCommentWithFlag[];
    authorList: string[];
  } = React.useMemo(() => {
    const authorList = [
      ...new Set(allCommentsWithFlagData.map((comment) => comment.author.name)),
    ];

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
      authorList,
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
    authorList,
    isLoading: isLoadingPosts || isLoadingFlags,
  };
}
