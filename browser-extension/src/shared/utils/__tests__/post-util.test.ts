import { describe, it, expect } from "vitest";
import { CommentSnapshot, PostSnapshot } from "@/shared/model/PostSnapshot";
import { getAllCommentsAndRepliesFromPostList } from "../post-util";

function checkDistinctComments(comments: CommentSnapshot[]) {
  const ids = comments.map((c) => c.id);
  const uniqueIds = new Set(ids);
  expect(uniqueIds.size).toEqual(ids.length);
}

describe("Test get comments functions", () => {
  describe("getAllCommentsAndRepliesFromPostList", () => {
    it("Should return an empty array with no posts", () => {
      const posts: PostSnapshot[] = [];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(0);
    });

    it("Should return an empty array with post without comments", () => {
      const posts: PostSnapshot[] = [getDummyPostWithComments([])];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(0);
    });

    it("Should return one comment with post with one comment", () => {
      const posts: PostSnapshot[] = [
        getDummyPostWithComments([getDummyCommentWithReplies([])]),
      ];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(1);
    });

    it("Should return two comments with 2 post with one comment", () => {
      const posts: PostSnapshot[] = [
        getDummyPostWithComments([getDummyCommentWithReplies([])]),
        getDummyPostWithComments([getDummyCommentWithReplies([])]),
      ];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(2);
      checkDistinctComments(result);
    });

    it("Should return four comments with 2 post with two comments", () => {
      const posts: PostSnapshot[] = [
        getDummyPostWithComments([
          getDummyCommentWithReplies([]),
          getDummyCommentWithReplies([]),
        ]),
        getDummyPostWithComments([
          getDummyCommentWithReplies([]),
          getDummyCommentWithReplies([]),
        ]),
      ];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(4);
      checkDistinctComments(result);
    });

    it("Should return two comments with 1 post with one comment and one reply", () => {
      const posts: PostSnapshot[] = [
        getDummyPostWithComments([
          getDummyCommentWithReplies([getDummyCommentWithReplies([])]),
        ]),
      ];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(2);
      checkDistinctComments(result);
    });

    it("Should return three comments with 1 post with one comment and two replies", () => {
      const posts: PostSnapshot[] = [
        getDummyPostWithComments([
          getDummyCommentWithReplies([
            getDummyCommentWithReplies([]),
            getDummyCommentWithReplies([]),
          ]),
        ]),
      ];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(3);
      checkDistinctComments(result);
    });

    it("Should return three comments with 1 post with one comment and two nested replies", () => {
      const posts: PostSnapshot[] = [
        getDummyPostWithComments([
          getDummyCommentWithReplies([
            getDummyCommentWithReplies([getDummyCommentWithReplies([])]),
          ]),
        ]),
      ];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(3);
      checkDistinctComments(result);
    });

    it("Should return four comments with 1 post with one comment and three nested replies", () => {
      const posts: PostSnapshot[] = [
        getDummyPostWithComments([
          getDummyCommentWithReplies([
            getDummyCommentWithReplies([
              getDummyCommentWithReplies([getDummyCommentWithReplies([])]),
            ]),
          ]),
        ]),
      ];
      const result = getAllCommentsAndRepliesFromPostList(posts);
      expect(result.length).toEqual(4);
      checkDistinctComments(result);
    });
  });

  // All objects created in tests have unique id thanks to autoIncrementId
  let autoIncrementId = 1;

  function getDummyPostWithComments(comments: CommentSnapshot[]): PostSnapshot {
    return {
      id: `${autoIncrementId++}`,
      title: "Post",
      publishedAt: { type: "absolute", date: "2026-02-11" },
      url: "",
      scrapedAt: "",
      author: { name: "Author", accountHref: "author" },
      comments: comments,
      postId: "",
      socialNetwork: "YOUTUBE",
    };
  }

  function getDummyCommentWithReplies(
    replies: CommentSnapshot[],
  ): CommentSnapshot {
    return {
      id: `${autoIncrementId++}`,
      publishedAt: { type: "absolute", date: "2026-02-11" },
      scrapedAt: "",
      author: { name: "Author", accountHref: "author" },
      replies: replies,
      textContent: "",
      screenshotData: "",
      nbLikes: 0,
    };
  }
});
