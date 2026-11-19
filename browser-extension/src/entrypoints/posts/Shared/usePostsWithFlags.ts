import type { Post, PostWithFlags } from "@/shared/model/post/Post";
import { getPostHateFlagsList } from "@/shared/storage/hate-flags-storage";
import React from "react";
import { useQuery } from "@tanstack/react-query";

export function usePostsWithFlags(posts: Post[] | undefined): {
  postsWithFlags: PostWithFlags[];
  isLoading: boolean;
} {
  const postIdList = React.useMemo(
    () => posts?.map((post) => post.postId) ?? [],
    [posts],
  );
  const hateFlagsQueryKey = React.useMemo(
    () => ["postHateFlags", postIdList.join(",")],
    [postIdList],
  );

  const { data: flaggedCommentIds = new Set<string>(), isLoading } = useQuery({
    queryKey: hateFlagsQueryKey,
    queryFn: async () => {
      const hateFlags = await getPostHateFlagsList(postIdList);
      const comments = (posts ?? []).flatMap((post) =>
        post.comments.map((comment) => ({ postId: post.postId, comment })),
      );

      return new Set(
        comments.flatMap(({ postId, comment }) => {
          const flagsForPost = hateFlags.find(
            (flags) => flags.postId === postId,
          );
          return flagsForPost?.hateFlags[comment.commentRevisionId]
            ? [comment.commentRevisionId]
            : [];
        }),
      );
    },
    enabled: posts !== undefined,
  });

  const postsWithFlags = React.useMemo((): PostWithFlags[] => {
    if (!posts || posts.length === 0) {
      return [];
    }

    return posts.map((post) => ({
      ...post,
      comments: post.comments.map((comment) => ({
        ...comment,
        isFlagged: flaggedCommentIds.has(comment.commentRevisionId),
      })),
    }));
  }, [posts, flaggedCommentIds]);

  return { postsWithFlags, isLoading };
}
