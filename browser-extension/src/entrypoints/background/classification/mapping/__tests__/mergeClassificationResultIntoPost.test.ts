import { describe, it, expect } from "vitest";
import { Post, Comment, AbsoluteDate } from "@/shared/model/post";
import {
  ClassificationResult,
  ClassificationResultStatus,
  CommentClassificationResult,
} from "../../api/getClassificationResult";
import { mergeClassificationResultIntoPost } from "../mergeClassificationResultIntoPost";

describe("mergeClassificationResultIntoPost", () => {
  function absoluteDate(
    isoDate: string = "2024-01-14T12:00:00.000Z",
  ): AbsoluteDate {
    return {
      type: "absolute",
      date: isoDate,
    };
  }
  function createMockPost(comments: Comment[]): Post {
    return {
      url: "https://example.com/post/123",
      publishedAt: { type: "absolute", date: "2024-01-15T10:00:00.000Z" },
      scrapedAt: "2024-01-15T12:00:00.000Z",
      author: {
        name: "Test Author",
        accountHref: "https://example.com/author",
      },
      postId: "post-123",
      socialNetwork: "YOUTUBE",
      comments,
    };
  }

  function createNotCompletedClassificationResult(
    status: ClassificationResultStatus,
  ): ClassificationResult {
    return {
      id: "job-123",
      status: status,
      comments: null,
    };
  }

  function createCompletedClassificationResult(
    comments: Record<string, CommentClassificationResult>,
  ): ClassificationResult {
    return {
      id: "job-123",
      status: "COMPLETED",
      comments,
    };
  }

  it("should set classificationStatus to COMPLETED", () => {
    const post = createMockPost([]);
    const result = createCompletedClassificationResult({});

    const updatedPost = mergeClassificationResultIntoPost(post, result);

    expect(updatedPost.classificationStatus).toBe("COMPLETED");
  });
  it("should set classificationStatus to IN_PROGRESS", () => {
    const post = createMockPost([]);
    const result = createNotCompletedClassificationResult("IN_PROGRESS");

    const updatedPost = mergeClassificationResultIntoPost(post, result);

    expect(updatedPost.classificationStatus).toBe("IN_PROGRESS");
  });

  it("should add classification to comments when COMPLETED", () => {
    const commentId = "123e4567-e89b-12d3-a456-426614174001";
    const replyId1 = "123e4567-e89b-12d3-a456-426614174002";
    const replyId2 = "123e4567-e89b-12d3-a456-426614174003";

    const post = createMockPost([
      {
        id: commentId,
        textContent: "Parent comment",
        author: { name: "Author", accountHref: "https://example.com" },
        screenshotData: "data:image/png;base64,abc123",
        scrapedAt: "2024-01-15T12:00:00.000Z",
        publishedAt: absoluteDate(),
        replies: [
          {
            id: replyId1,
            textContent: "First level reply",
            author: { name: "Author1", accountHref: "https://example.com/1" },
            screenshotData: "data:image/png;base64,reply1",
            scrapedAt: "2024-01-15T12:00:00.000Z",
            publishedAt: absoluteDate(),
            replies: [
              {
                id: replyId2,
                textContent: "Second level reply",
                author: {
                  name: "Author2",
                  accountHref: "https://example.com/2",
                },
                screenshotData: "data:image/png;base64,reply2",
                scrapedAt: "2024-01-15T12:00:00.000Z",
                publishedAt: absoluteDate(),
                replies: [],
                nbLikes: 0,
              },
            ],
            nbLikes: 0,
          },
        ],
        nbLikes: 0,
      },
    ]);
    const result = createCompletedClassificationResult({
      [commentId]: {
        classification: ["toxic"],
        classified_at: "2024-01-15T14:00:00.000Z",
      },
      [replyId1]: {
        classification: ["neutral"],
        classified_at: "2024-01-15T14:30:00.000Z",
      },
      [replyId2]: {
        classification: ["friendly"],
        classified_at: "2024-01-15T15:00:00.000Z",
      },
    });

    const updatedPost = mergeClassificationResultIntoPost(post, result);

    expect(updatedPost.comments[0].classification).toEqual(["toxic"]);
    expect(updatedPost.comments[0].replies[0].classification).toEqual([
      "neutral",
    ]);
    expect(
      updatedPost.comments[0].replies[0].replies[0].classification,
    ).toEqual(["friendly"]);
  });
});
