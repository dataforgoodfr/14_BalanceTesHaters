import type {
  CommentFilters,
  CommentSortingCategory,
  PostCommentWithIdAndFlag,
} from "@/shared/utils/post-util";
import {
  buildPostKey,
  emptyCommentFilters,
  filterCommentList,
  sortCommentList,
} from "@/shared/utils/post-util";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostsByPostIdList } from "@/shared/storage/post-storage";
import {
  commentHateFlagKey,
  getPostHateFlagsList,
} from "@/shared/storage/hate-flags-storage";

export type useFilteredCommentListData = {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  commentFilters: CommentFilters;
  setCommentFilters: (commentFilters: CommentFilters) => void;
  allComments: PostCommentWithIdAndFlag[];
  filteredCommentList: PostCommentWithIdAndFlag[];
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
        const allCommentsWithFlagData: PostCommentWithIdAndFlag[] = [];
        const hateFlags = await getPostHateFlagsList(postIdList);

        for (const post of data ?? []) {
          for (const comment of post.comments) {
            const flagsForPost = hateFlags.find(
              (flags) => flags.postId === post.postId,
            );
            const key = await commentHateFlagKey(comment.textContent);
            const isFlagged = flagsForPost?.hateFlags[key] ?? false;

            allCommentsWithFlagData.push({
              ...comment,
              id: `${post.postId}-${comment.textContent}`, // Unique ID for the comment
              postId: post.postId,
              socialNetwork: post.socialNetwork,
              postKey: buildPostKey(post.postId, post.socialNetwork),
              isFlagged,
            });
          }
        }

        return allCommentsWithFlagData;
      },
      enabled: data !== undefined,
    },
  );

  // On définit arbitrairement un id pour être en mesure de sélectionner les commentaires
  //  et une clé postKey pour différencier les commentaires issus de différents posts
  const {
    filteredCommentList,
    hatefulAuthorList,
  }: {
    allComments: PostCommentWithIdAndFlag[];
    filteredCommentList: PostCommentWithIdAndFlag[];
    hatefulAuthorList: string[];
  } = React.useMemo(() => {
    const hatefulAuthorList: string[] = (allCommentsWithFlagData || [])
      .filter((comment) => comment.isFlagged)
      .map((comment) => comment.author.name);

    const filteredCommentList: PostCommentWithIdAndFlag[] = filterCommentList(
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
