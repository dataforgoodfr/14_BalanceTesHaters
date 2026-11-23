import type { Post, PostWithFlags } from "@/shared/model/post/Post";
import { usePostHateFlagsList } from "./usePostHateFlagsList";
import React from "react";

export function usePostsWithFlags(posts: Post[] | undefined): {
  postsWithFlags: PostWithFlags[];
  isLoading: boolean;
} {
  const postIdList = React.useMemo(
    () => posts?.map((post) => post.postId) ?? [],
    [posts],
  );

  const { data: hateFlags = [], isLoading } = usePostHateFlagsList(
    postIdList,
    posts !== undefined,
  );

  const postsWithFlags = React.useMemo((): PostWithFlags[] => {
    if (!posts || posts.length === 0) {
      return [];
    }

    return posts.map((post) => ({
      ...post,
      comments: post.comments.map((comment) => ({
        ...comment,
        isFlagged:
          hateFlags.find((flags) => flags.postId === post.postId)?.hateFlags[
            comment.commentRevisionId
          ] ?? false,
      })),
    }));
  }, [posts, hateFlags]);

  return { postsWithFlags, isLoading };
}
