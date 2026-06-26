import {
  buildPostKey,
  CommentFilters,
  CommentSortingCategory,
  emptyCommentFilters,
  filterCommentList,
  isCommentHateful,
  sortCommentList,
} from "@/shared/utils/post-util";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostsByPostIdList } from "@/shared/storage/post-storage";
import { PostCommentWithId } from "../Posts/CommentsTable";

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
  const queryKey = React.useMemo(
    () => ["posts", postIdList.join(",")],
    [postIdList],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getPostsByPostIdList(postIdList),
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
          return { ...comment, id: i.toString() };
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
    }, [data, searchTerm, commentFilters, commentSortingCategory]);

  return {
    searchTerm,
    setSearchTerm,
    commentFilters,
    setCommentFilters,
    filteredCommentList: filteredCommentList,
    hatefulAuthorList,
    isLoading,
  };
}
