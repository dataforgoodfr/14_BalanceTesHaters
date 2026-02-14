import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  postClassificationRequest,
  ClassificationRequest,
  ClassificationResponse,
} from "../submitClassificationRequest";
import { ClassificationApiError } from "../ClassificationApiError";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the apiBaseUrl
vi.mock("../baseUrl", () => ({
  apiBaseUrl: "http://localhost:8000",
}));

describe("postClassificationRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should call the correct endpoint with correct payload", async () => {
    const mockRequest: ClassificationRequest = {
      author: {
        name: "testuser",
        account_href: "https://example.com/user/testuser",
      },
      comments: [
        {
          id: "comment-1",
          text_content: "Parent comment",
          author: {
            name: "commenter1",
            account_href: "https://example.com/user/commenter1",
          },
          replies: [
            {
              id: "reply-1",
              text_content: "Child comment",
              author: {
                name: "replier1",
                account_href: "https://example.com/user/replier1",
              },
              replies: [],
            },
          ],
        },
      ],
    };

    const mockResponseData: ClassificationResponse = {
      job_id: "test-job-123",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponseData),
    });

    await postClassificationRequest(mockRequest);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/classification",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockRequest),
      }),
    );
  });

  it("should return ClassificationResponse when API returns 200 with valid data", async () => {
    const mockRequest: ClassificationRequest = {
      author: {
        name: "testuser",
        account_href: "https://example.com/user/testuser",
      },
      comments: [],
    };

    const mockResponseData: ClassificationResponse = {
      job_id: "123e4567-e89b-12d3-a456-426614174000",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponseData),
    });

    const result = await postClassificationRequest(mockRequest);

    expect(result).toEqual(mockResponseData);
    expect(result.job_id).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("should throw when response data is invalid (missing job_id)", async () => {
    const mockRequest: ClassificationRequest = {
      author: {
        name: "testuser",
        account_href: "https://example.com/user/testuser",
      },
      comments: [],
    };

    const invalidResponseData = {
      // missing job_id
      status: "completed",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(invalidResponseData),
    });

    await expect(postClassificationRequest(mockRequest)).rejects.toThrow();
  });

  it("should throw ClassificationApiError when API returns 500", async () => {
    const mockRequest: ClassificationRequest = {
      author: {
        name: "testuser",
        account_href: "https://example.com/user/testuser",
      },
      comments: [],
    };

    const errorText = "Internal Server Error";

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(errorText),
    });

    await expect(postClassificationRequest(mockRequest)).rejects.toThrow(
      ClassificationApiError,
    );
  });
});
