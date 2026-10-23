import type {
  CommentFilters,
  CommentSortingCategory,
  PostCommentWithId,
} from "@/shared/utils/post-util";
import {
  buildPostKey,
  emptyCommentFilters,
  filterCommentList,
  isCommentHateful,
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
  filteredCommentList: PostCommentWithId[];
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

  // On définit arbitrairement un id pour être en mesure de sélectionner les commentaires
  //  et une clé postKey pour différencier les commentaires issus de différents posts
  const {
    filteredCommentList,
    hatefulAuthorList,
  }: { filteredCommentList: PostCommentWithId[]; hatefulAuthorList: string[] } =
    React.useMemo(() => {
      const allComments: PostCommentWithId[] = (data || [])
        .flatMap((p) => {
          return p.comments.map(
            (comment) =>
              ({
                ...comment,
                postId: p.postId,
                socialNetwork: p.socialNetwork,
                postKey: buildPostKey(p.postId, p.socialNetwork),
                isCommentHateful: isCommentHateful(comment),
              }) as PostCommentWithId,
          );
        })
        .map((comment, i) => {
          const id = i.toString();
          return {
            ...comment,
            id,
            IsFlagged: flaggedCommentIds.has(id),
          };
        });

      const hatefulAuthorList: string[] = allComments
        .filter((comment) => comment.isCommentHateful)
        .map((comment) => comment.author.name);

      const filteredCommentList: PostCommentWithId[] = filterCommentList(
        allComments,
        searchTerm,
        commentFilters,
      );
      return {
        filteredCommentList: sortCommentList(
          filteredCommentList,
          commentSortingCategory,
        ),
        hatefulAuthorList,
      };
    }, [
      data,
      flaggedCommentIds,
      searchTerm,
      commentFilters,
      commentSortingCategory,
    ]);

  return {
    searchTerm,
    setSearchTerm,
    commentFilters,
    setCommentFilters,
    filteredCommentList: filteredCommentList,
    hatefulAuthorList,
    isLoading: isLoadingPosts || isLoadingFlags,
  };
}
