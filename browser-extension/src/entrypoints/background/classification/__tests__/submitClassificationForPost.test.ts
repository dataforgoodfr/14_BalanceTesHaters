import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPostSnapshotById: vi.fn(),
  updatePostSnapshot: vi.fn(),
  mapPostToClassificationRequest: vi.fn(() => ({
    author: { name: "author", account_href: "https://example.com/author" },
    comments: [],
  })),
  postClassificationRequest: vi.fn(),
}));

vi.mock("@/shared/storage/post-snapshot-storage", () => ({
  getPostSnapshotById: mocks.getPostSnapshotById,
  updatePostSnapshot: mocks.updatePostSnapshot,
}));

vi.mock("../mapping/mapPostToClassificationRequest", () => ({
  mapPostToClassificationRequest: mocks.mapPostToClassificationRequest,
}));

vi.mock("../api/submitClassificationRequest", () => ({
  postClassificationRequest: mocks.postClassificationRequest,
}));

import { submitClassificationRequestForPost } from "../submitClassificationForPost";

const submittedPost = {
  id: "0ee1449b-64be-43f2-9cd5-d352b951cd72",
  classificationJobId: "existing-job",
  classificationStatus: "COMPLETED",
} as PostSnapshot;

describe("submitClassificationRequestForPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPostSnapshotById.mockResolvedValue({ ...submittedPost });
    mocks.postClassificationRequest.mockResolvedValue({ job_id: "new-job" });
    mocks.updatePostSnapshot.mockResolvedValue(undefined);
  });

  it("rejects an already submitted post by default", async () => {
    await expect(
      submitClassificationRequestForPost(submittedPost.id),
    ).rejects.toThrow("already has a classificationJobId");

    expect(mocks.postClassificationRequest).not.toHaveBeenCalled();
    expect(mocks.updatePostSnapshot).not.toHaveBeenCalled();
  });

  it("replaces the job after an explicitly allowed resubmission", async () => {
    await submitClassificationRequestForPost(submittedPost.id, true);

    expect(mocks.postClassificationRequest).toHaveBeenCalledOnce();
    expect(mocks.updatePostSnapshot).toHaveBeenCalledWith({
      ...submittedPost,
      classificationJobId: "new-job",
      classificationStatus: "SUBMITTED",
    });
  });
});
