import type { Post, PostWithFlags } from "@/shared/model/post/Post";
import {
  commentHateFlagKey,
  getPostHateFlagsList,
} from "@/shared/storage/hate-flags-storage";
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
    enabled: posts !== undefined,
  });

  const postsWithFlags = React.useMemo((): PostWithFlags[] => {
    if (!posts || posts.length === 0) {
      return [];
    }

    let commentIndex = 0;
    return posts.map((post) => ({
      ...post,
      comments: post.comments.map((comment) => {
        const id = commentIndex.toString();
        commentIndex += 1;
        return { ...comment, isFlagged: flaggedCommentIds.has(id) };
      }),
    }));
  }, [posts, flaggedCommentIds]);

  return { postsWithFlags, isLoading };
}
