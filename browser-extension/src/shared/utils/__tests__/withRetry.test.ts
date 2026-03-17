import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "../withRetry";

describe("withRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("successful execution", () => {
    it("should return the result when function succeeds on first attempt", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");

      const result = await withRetry({
        retry: mockFn,
      });

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry behavior", () => {
    it("should retry and succeed on second attempt", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValue("success");

      const result = await withRetry({
        maxAttempts: 3,
        retry: mockFn,
      });

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should retry multiple times until success", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue("success");

      const result = await withRetry({
        maxAttempts: 3,
        retry: mockFn,
      });

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should exhaust all attempts and throw the last error", async () => {
      const error = new Error("Persistent failure");
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry({
          maxAttempts: 3,
          retry: mockFn,
        }),
      ).rejects.toThrow("Persistent failure");

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it("should throw immediately when maxAttempts is 1 and function fails", async () => {
      const error = new Error("Failed");
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry({
          maxAttempts: 1,
          retry: mockFn,
        }),
      ).rejects.toThrow("Failed");

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("retryOn option", () => {
    it("should not retry when retryOn returns false", async () => {
      const error = new Error("Non-retriable error");
      const mockFn = vi.fn().mockRejectedValue(error);
      const retryOn = vi.fn().mockReturnValue(false);

      await expect(
        withRetry({
          maxAttempts: 3,
          retryOn,
          retry: mockFn,
        }),
      ).rejects.toThrow("Non-retriable error");

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(retryOn).toHaveBeenCalledWith(error);
    });

    it("should retry when retryOn returns true", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Retriable error"))
        .mockResolvedValue("success");
      const retryOn = vi.fn().mockReturnValue(true);

      const result = await withRetry({
        maxAttempts: 3,
        retryOn,
        retry: mockFn,
      });

      expect(result).toBe("success");
      expect(retryOn).toHaveBeenCalledTimes(1);
    });

    it("should only retry on specific error types when retryOn filters", async () => {
      const retriableError = new Error("Network error");
      const nonRetriableError = new Error("Validation error");

      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(retriableError)
        .mockRejectedValueOnce(nonRetriableError)
        .mockResolvedValue("success");

      const retryOn = vi.fn((error: unknown) => {
        return error instanceof Error && error.message === "Network error";
      });

      await expect(
        withRetry({
          maxAttempts: 3,
          retryOn,
          retry: mockFn,
        }),
      ).rejects.toThrow("Validation error");

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("beforeRetry option", () => {
    it("should call beforeRetry with correct remainingAttempts on each retry", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("First"))
        .mockRejectedValueOnce(new Error("Second"))
        .mockResolvedValue("success");
      const beforeRetry = vi.fn().mockResolvedValue(undefined);

      await withRetry({
        maxAttempts: 3,
        beforeRetry,
        retry: mockFn,
      });

      expect(beforeRetry).toHaveBeenCalledTimes(2);
      expect(beforeRetry).toHaveBeenNthCalledWith(1, {
        latestError: expect.any(Error),
        failedAttempts: 1,
        remainingAttempts: 2,
      });
      expect(beforeRetry).toHaveBeenNthCalledWith(2, {
        latestError: expect.any(Error),
        failedAttempts: 2,
        remainingAttempts: 1,
      });
    });

    it("should not call beforeRetry when function succeeds on first attempt", async () => {
      const mockFn = vi.fn().mockResolvedValue("success");
      const beforeRetry = vi.fn().mockResolvedValue(undefined);

      await withRetry({
        maxAttempts: 3,
        beforeRetry,
        retry: mockFn,
      });

      expect(beforeRetry).not.toHaveBeenCalled();
    });

    it("should not call beforeRetry when retryOn returns false", async () => {
      const error = new Error("Non-retriable");
      const mockFn = vi.fn().mockRejectedValue(error);
      const beforeRetry = vi.fn().mockResolvedValue(undefined);
      const retryOn = vi.fn().mockReturnValue(false);

      await expect(
        withRetry({
          maxAttempts: 3,
          beforeRetry,
          retryOn,
          retry: mockFn,
        }),
      ).rejects.toThrow();

      expect(beforeRetry).not.toHaveBeenCalled();
    });

    it("should handle async beforeRetry function", async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValue("success");
      const beforeRetry = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 10));
      });

      const result = await withRetry({
        maxAttempts: 2,
        beforeRetry,
        retry: mockFn,
      });

      expect(result).toBe("success");
      expect(beforeRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("return value type", () => {
    it("should return correct type for string result", async () => {
      const mockFn = vi.fn().mockResolvedValue("hello");

      const result = await withRetry({
        retry: mockFn,
      });

      expect(typeof result).toBe("string");
      expect(result).toBe("hello");
    });

    it("should return correct type for object result", async () => {
      const mockData = { key: "value", nested: { a: 1 } };
      const mockFn = vi.fn().mockResolvedValue(mockData);

      const result = await withRetry({
        retry: mockFn,
      });

      expect(result).toEqual(mockData);
    });

    it("should return correct type for array result", async () => {
      const mockData = [1, 2, 3];
      const mockFn = vi.fn().mockResolvedValue(mockData);

      const result = await withRetry({
        retry: mockFn,
      });

      expect(result).toEqual(mockData);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined error gracefully", async () => {
      const mockFn = vi.fn().mockRejectedValue(undefined);

      await expect(
        withRetry({
          maxAttempts: 1,
          retry: mockFn,
        }),
      ).rejects.toBeUndefined();
    });

    it("should handle null error gracefully", async () => {
      const mockFn = vi.fn().mockRejectedValue(null);

      await expect(
        withRetry({
          maxAttempts: 1,
          retry: mockFn,
        }),
      ).rejects.toBeNull();
    });

    it("should handle non-Error objects as errors", async () => {
      const mockFn = vi.fn().mockRejectedValue("string error");
      const retryOn = vi.fn().mockReturnValue(true);

      await expect(
        withRetry({
          maxAttempts: 1,
          retryOn,
          retry: mockFn,
        }),
      ).rejects.toBe("string error");
    });

    it("should work with async functions", async () => {
      const asyncFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return "async result";
      });

      const result = await withRetry({
        retry: asyncFn,
      });

      expect(result).toBe("async result");
    });
  });
});
