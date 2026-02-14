import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getClassificationResult,
  ClassificationResult,
  ClassificationResultPayload,
} from "../getClassificationResult";
import { ClassificationApiError } from "../ClassificationApiError";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("../baseUrl", () => ({
  apiBaseUrl: "http://localhost:8000",
}));

describe("getClassificationResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should call the correct endpoint with correct payload", async () => {
    const mockJobId = "test-job-123";
    const mockResponseData: ClassificationResult = {
      id: mockJobId,
      status: "COMPLETED",
      comments: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponseData),
    });

    await getClassificationResult(mockJobId);

    expect(mockFetch).toHaveBeenCalledWith(
      `http://localhost:8000/classification/${mockJobId}`,
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("ClassificationResult when status=COMPLETED", async () => {
    const mockJobId = "123e4567-e89b-12d3-a456-426614174000";
    const mockResponseData: ClassificationResultPayload = {
      id: mockJobId,
      status: "COMPLETED",
      comments: {
        "123e4567-e89b-12d3-a456-426614174001": {
          classification: ["category1", "category2"],
          classified_at: "2024-01-15T10:30:00.000Z",
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponseData),
    });

    const result = await getClassificationResult(mockJobId);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/classification/${mockJobId}`),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    expect(result).toEqual(mockResponseData);
    expect(result.id).toBe(mockJobId);
    expect(result.status).toBe("COMPLETED");
  });

  it("ClassificationResult when status=IN_PROGRESS", async () => {
    const mockJobId = "123e4567-e89b-12d3-a456-426614174000";
    const mockResponseData: ClassificationResultPayload = {
      id: mockJobId,
      status: "IN_PROGRESS",
      comments: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponseData),
    });

    const result = await getClassificationResult(mockJobId);
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("ClassificationResult when status=SUBMITTED", async () => {
    const mockJobId = "123e4567-e89b-12d3-a456-426614174000";
    const mockResponseData: ClassificationResultPayload = {
      id: mockJobId,
      status: "SUBMITTED",
      comments: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponseData),
    });

    const result = await getClassificationResult(mockJobId);
    expect(result.status).toBe("SUBMITTED");
  });

  describe("error handling", () => {
    it("should throw ClassificationApiError when API returns 404", async () => {
      const mockJobId = "nonexistent-job-id";
      const errorText = "Job not found";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(errorText),
      });

      await expect(getClassificationResult(mockJobId)).rejects.toThrow(
        ClassificationApiError,
      );
    });

    it("should throw when response data is invalid (missing required fields)", async () => {
      const mockJobId = "123e4567-e89b-12d3-a456-426614174000";
      const invalidResponseData = {
        // missing job_id and status
        comments: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponseData),
      });

      await expect(getClassificationResult(mockJobId)).rejects.toThrow();
    });

    it("should throw when status is invalid", async () => {
      const mockJobId = "123e4567-e89b-12d3-a456-426614174000";
      const invalidResponseData = {
        id: mockJobId,
        status: "INVALID_STATUS", // not in the enum
        comments: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponseData),
      });

      await expect(getClassificationResult(mockJobId)).rejects.toThrow();
    });

    it("should throw when comment id is not a valid UUID", async () => {
      const mockJobId = "123e4567-e89b-12d3-a456-426614174000";
      const invalidResponseData = {
        job_id: mockJobId,
        status: "COMPLETED",
        comments: {
          "not-a-uuid": {
            // invalid UUID
            id: "not-a-uuid",
            replies: {},
            classification: ["toxic"],
            classified_at: "2024-01-15T10:30:00.000Z",
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponseData),
      });

      await expect(getClassificationResult(mockJobId)).rejects.toThrow();
    });
  });
});
