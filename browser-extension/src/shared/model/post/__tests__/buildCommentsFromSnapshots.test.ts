import { describe, it, expect } from "vitest";
import { buildCommentsFromSnapshots } from "../buildCommentsFromSnapshots";
import { PostSnapshot, CommentSnapshot } from "../../PostSnapshot";

describe("buildCommentsFromSnapshots", () => {
  describe("empty input", () => {
    it("should return empty array when given empty postSnapshots array", () => {
      const result = buildCommentsFromSnapshots([]);
      expect(result).toEqual([]);
    });

    it("should return empty array when snapshots have no comments", () => {
      const snapshot1 = createMinimalPostSnapshot([]);
      const snapshot2 = createMinimalPostSnapshot([]);
      const result = buildCommentsFromSnapshots([snapshot1, snapshot2]);
      expect(result).toEqual([]);
    });
  });

  describe("single snapshot", () => {
    it("should return single comment when given single snapshot with one comment", () => {
      const comment = createCommentSnapshot({ textContent: "Hello World" });
      const snapshot = createMinimalPostSnapshot([comment]);
      const result = buildCommentsFromSnapshots([snapshot]);

      expect(result).toHaveLength(1);
      expect(result[0].author).toBe(comment.author);
      expect(result[0].textContent).toBe(comment.textContent);
      expect(result[0].isNew).toBe(false);
      expect(result[0].isDeleted).toBe(false);
    });

    it("should return multiple comments when given single snapshot with multiple comments", () => {
      const comment1 = createCommentSnapshot({ textContent: "First comment" });
      const comment2 = createCommentSnapshot({ textContent: "Second comment" });
      const comment3 = createCommentSnapshot({ textContent: "Third comment" });
      const snapshot = createMinimalPostSnapshot([
        comment1,
        comment2,
        comment3,
      ]);

      const result = buildCommentsFromSnapshots([snapshot]);

      expect(result).toHaveLength(3);
      expect(result[0].textContent).toBe(comment1.textContent);
      expect(result[1].textContent).toBe(comment2.textContent);
      expect(result[2].textContent).toBe(comment3.textContent);
      // All comments from single snapshot are NOT new (isNew requires postSnapshotsCount > 1)
      expect(result.every((c) => c.isNew)).toBe(false);
      expect(result.every((c) => c.isDeleted)).toBe(false);
    });

    it("should flatten nested replies", () => {
      const reply1 = createCommentSnapshot({
        commentId: "reply-1",
        textContent: "Reply 1",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });
      const reply2 = createCommentSnapshot({
        commentId: "reply-2",
        textContent: "Reply 2",
        scrapedAt: "2024-01-01T00:03:00.000Z",
      });
      const parentComment = createCommentSnapshot({
        commentId: "parent",
        textContent: "Parent comment",
        replies: [reply1, reply2],
      });

      const snapshot = createMinimalPostSnapshot([parentComment]);
      const result = buildCommentsFromSnapshots([snapshot]);

      // Should have 3 comments: parent + 2 replies (flattened)
      expect(result).toHaveLength(3);
      // PostComment doesn't have commentId field, so we check by textContent
      expect(result[0].textContent).toBe(parentComment.textContent);
      expect(result[1].textContent).toBe(reply1.textContent);
      expect(result[2].textContent).toBe(reply2.textContent);
    });
  });

  describe("multiple snapshots - same comment persists", () => {
    it("should mark comment as not new and not deleted when it persists across snapshots", () => {
      const comment1 = createCommentSnapshot({
        commentId: "same-comment",
        textContent: "Same text",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const comment2 = createCommentSnapshot({
        commentId: "same-comment",
        textContent: "Same text",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([comment1]);
      const snapshot2 = createMinimalPostSnapshot([comment2]);

      const result = buildCommentsFromSnapshots([snapshot1, snapshot2]);

      expect(result).toHaveLength(1);
      expect(result[0].textContent).toBe("Same text");
      expect(result[0].isNew).toBe(false); // not from latest snapshot only
      expect(result[0].isDeleted).toBe(false); // still present in latest
    });
  });

  describe("multiple snapshots - text content changes", () => {
    it("should create separate comments when text content changes", () => {
      const comment1 = createCommentSnapshot({
        commentId: "edited-comment",
        textContent: "Original text",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const comment2 = createCommentSnapshot({
        commentId: "edited-comment",
        textContent: "Edited text",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([comment1]);
      const snapshot2 = createMinimalPostSnapshot([comment2]);

      const result = buildCommentsFromSnapshots([snapshot1, snapshot2]);

      // Should have 2 separate entries: original and edited
      expect(result).toHaveLength(2);

      // First entry is the original text
      expect(result[0].textContent).toBe("Original text");
      expect(result[0].isNew).toBe(false);
      expect(result[0].isDeleted).toBe(true); // original text no longer exists in latest

      // Second entry is the edited text
      expect(result[1].textContent).toBe("Edited text");
      expect(result[1].isNew).toBe(true);
      expect(result[1].isDeleted).toBe(false);
    });

    it("should handle multiple edits of same comment", () => {
      const comment1 = createCommentSnapshot({
        commentId: "multi-edit",
        textContent: "Version 1",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const comment2 = createCommentSnapshot({
        commentId: "multi-edit",
        textContent: "Version 2",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });
      const comment3 = createCommentSnapshot({
        commentId: "multi-edit",
        textContent: "Version 3",
        scrapedAt: "2024-01-01T00:03:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([comment1]);
      const snapshot2 = createMinimalPostSnapshot([comment2]);
      const snapshot3 = createMinimalPostSnapshot([comment3]);

      const result = buildCommentsFromSnapshots([
        snapshot1,
        snapshot2,
        snapshot3,
      ]);

      expect(result).toHaveLength(3);

      // Each version should be its own entry
      expect(result[0].textContent).toBe("Version 1");
      expect(result[0].isNew).toBe(false);
      expect(result[0].isDeleted).toBe(true);

      expect(result[1].textContent).toBe("Version 2");
      expect(result[1].isNew).toBe(false);
      expect(result[1].isDeleted).toBe(true);

      expect(result[2].textContent).toBe("Version 3");
      expect(result[2].isNew).toBe(true);
      expect(result[2].isDeleted).toBe(false);
    });
  });

  describe("multiple snapshots - isNew flag", () => {
    it("should mark comment as isNew=true when added in latest snapshot only", () => {
      const comment1 = createCommentSnapshot({
        commentId: "old-comment",
        textContent: "Old comment",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const comment2 = createCommentSnapshot({
        commentId: "new-comment",
        textContent: "New comment",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([comment1]);
      const snapshot2 = createMinimalPostSnapshot([comment1, comment2]);

      const result = buildCommentsFromSnapshots([snapshot1, snapshot2]);

      expect(result).toHaveLength(2);

      // PostComment doesn't have commentId, check by textContent
      const oldComment = result.find((c) => c.textContent === "Old comment")!;
      const newComment = result.find((c) => c.textContent === "New comment")!;

      expect(oldComment.isNew).toBe(false);
      expect(newComment.isNew).toBe(true);
    });
  });

  describe("multiple snapshots - isDeleted flag", () => {
    it("should mark comment as isDeleted=true when removed in latest snapshot", () => {
      const comment1 = createCommentSnapshot({
        commentId: "deleted-comment",
        textContent: "Will be deleted",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([comment1]);
      const snapshot2 = createMinimalPostSnapshot([]); // No comments in latest

      const result = buildCommentsFromSnapshots([snapshot1, snapshot2]);

      expect(result).toHaveLength(1);
      expect(result[0].isDeleted).toBe(true);
      expect(result[0].isNew).toBe(false);
    });
  });

  describe("multiple snapshots - combination of new and deleted", () => {
    it("should correctly handle mix of new, deleted, and persisted comments", () => {
      // Snapshot 1: comment A, comment B
      const commentA_v1 = createCommentSnapshot({
        commentId: "comment-a",
        textContent: "Comment A",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const commentB_v1 = createCommentSnapshot({
        commentId: "comment-b",
        textContent: "Comment B",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });

      // Snapshot 2: comment A (unchanged), comment C (new)
      const commentA_v2 = createCommentSnapshot({
        commentId: "comment-a",
        textContent: "Comment A",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });
      const commentC_v2 = createCommentSnapshot({
        commentId: "comment-c",
        textContent: "Comment C",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([commentA_v1, commentB_v1]);
      const snapshot2 = createMinimalPostSnapshot([commentA_v2, commentC_v2]);

      const result = buildCommentsFromSnapshots([snapshot1, snapshot2]);

      expect(result).toHaveLength(3);

      // Comment A persisted - not new, not deleted
      expect(result[0].textContent).toBe(commentA_v1.textContent);
      expect(result[0].isNew).toBe(false);
      expect(result[0].isDeleted).toBe(false);

      // Comment B was deleted - not new, deleted
      expect(result[1].textContent).toBe(commentB_v1.textContent);
      expect(result[1].isNew).toBe(false);
      expect(result[1].isDeleted).toBe(true);

      // Comment C is new - new, not deleted
      expect(result[2].textContent).toBe(commentC_v2.textContent);
      expect(result[2].isNew).toBe(true);
      expect(result[2].isDeleted).toBe(false);
    });
  });

  describe("fallback commentId (author + date)", () => {
    it("should use author@date as commentId when commentId is not provided but absolute date is", () => {
      const comment1 = createCommentSnapshot({
        commentId: undefined,
        publishedAt: {
          type: "absolute",
          date: "2024-01-01T12:00:00.000Z",
        },
        textContent: "Comment with absolute date",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const comment2 = createCommentSnapshot({
        commentId: undefined,
        publishedAt: {
          type: "absolute",
          date: "2024-01-01T12:00:00.000Z",
        },
        textContent: "Comment with absolute date",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([comment1]);
      const snapshot2 = createMinimalPostSnapshot([comment2]);

      // Both comments have same author and same absolute date, so they should be grouped
      const result = buildCommentsFromSnapshots([snapshot1, snapshot2]);

      expect(result).toHaveLength(1);
      expect(result[0].textContent).toBe("Comment with absolute date");
      expect(result[0].isNew).toBe(false);
      expect(result[0].isDeleted).toBe(false);
    });

    it("should throw error when no commentId and no absolute date", () => {
      const comment = createCommentSnapshot({
        commentId: undefined,
        publishedAt: {
          type: "relative",
          dateText: "3 days ago",
          resolvedDateRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-04T00:00:00.000Z",
          },
        },
        textContent: "Comment with relative date",
      });

      const snapshot = createMinimalPostSnapshot([comment]);

      expect(() => buildCommentsFromSnapshots([snapshot])).toThrow(
        "Need a comment id or an oabsolute date",
      );
    });
  });

  describe("ordering", () => {
    it("should maintain order of comments as they appear in snapshots", () => {
      const comment1 = createCommentSnapshot({
        commentId: "c1",
        textContent: "First",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const comment2 = createCommentSnapshot({
        commentId: "c2",
        textContent: "Second",
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });
      const comment3 = createCommentSnapshot({
        commentId: "c3",
        textContent: "Third",
        scrapedAt: "2024-01-01T00:03:00.000Z",
      });

      const snapshot = createMinimalPostSnapshot([
        comment3,
        comment1,
        comment2,
      ]);

      const result = buildCommentsFromSnapshots([snapshot]);

      // Comments maintain the order they appear in the snapshot
      expect(result).toHaveLength(3);
      expect(result[0].textContent).toBe("Third");
      expect(result[1].textContent).toBe("First");
      expect(result[2].textContent).toBe("Second");
    });
  });

  describe("deduplication of consecutive same text", () => {
    it("should deduplicate comments with same commentId and consecutive same text", () => {
      const comment1 = createCommentSnapshot({
        commentId: "dedup-test",
        textContent: "Same text",
        scrapedAt: "2024-01-01T00:01:00.000Z",
      });
      const comment2 = createCommentSnapshot({
        commentId: "dedup-test",
        textContent: "Same text", // Same text - should be grouped
        scrapedAt: "2024-01-01T00:02:00.000Z",
      });
      const comment3 = createCommentSnapshot({
        commentId: "dedup-test",
        textContent: "Different text", // Different text - new group
        scrapedAt: "2024-01-01T00:03:00.000Z",
      });
      const comment4 = createCommentSnapshot({
        commentId: "dedup-test",
        textContent: "Different text", // Same as previous - grouped
        scrapedAt: "2024-01-01T00:04:00.000Z",
      });

      const snapshot1 = createMinimalPostSnapshot([comment1]);
      const snapshot2 = createMinimalPostSnapshot([comment2]);
      const snapshot3 = createMinimalPostSnapshot([comment3]);
      const snapshot4 = createMinimalPostSnapshot([comment4]);

      const result = buildCommentsFromSnapshots([
        snapshot1,
        snapshot2,
        snapshot3,
        snapshot4,
      ]);

      // Should have 2 groups: "Same text" (merged) and "Different text" (merged)
      expect(result).toHaveLength(2);

      expect(result[0].textContent).toBe("Same text");
      expect(result[0].isDeleted).toBe(true); // No longer in latest

      expect(result[1].textContent).toBe("Different text");
      // Different text first appeared in snapshot3, so it's not new (not only in snapshot4)
      expect(result[1].isNew).toBe(false);
      expect(result[1].isDeleted).toBe(false);
    });
  });
});

function createMinimalPostSnapshot(comments: CommentSnapshot[]): PostSnapshot {
  return {
    id: "post-snapshot-id-" + crypto.randomUUID(),
    postId: "test-post-id",
    socialNetwork: "YOUTUBE",
    url: "https://youtube.com/watch?v=test",
    publishedAt: {
      type: "absolute",
      date: "2024-01-01T00:00:00.000Z",
    },
    author: {
      name: "Test Author",
      accountHref: "https://youtube.com/channel/test",
    },
    scrapedAt: "2024-01-01T00:00:00.000Z",
    comments,
  };
}

function createCommentSnapshot(
  overrides: Partial<CommentSnapshot> = {},
): CommentSnapshot {
  return {
    id: crypto.randomUUID(),
    commentId: overrides.commentId ?? "comment-id-" + crypto.randomUUID(),
    textContent: overrides.textContent ?? "Test comment",
    author: {
      name: overrides.author?.name ?? "Comment Author",
      accountHref: "https://youtube.com/channel/comment-author",
    },
    publishedAt: overrides.publishedAt ?? {
      type: "absolute",
      date: "2024-01-01T00:00:00.000Z",
    },
    screenshotData: "dGVzdA==", // "test" in base64
    scrapedAt: overrides.scrapedAt ?? "2024-01-01T00:00:00.000Z",
    nbLikes: 0,
    replies: overrides.replies ?? [],
    ...overrides,
  };
}
