import {
  getPostSnapshotById,
  updatePostSnapshot,
} from "@/shared/storage/post-snapshot-storage";
import type { ClassificationResult } from "./api/getClassificationResult";
import { getClassificationResult } from "./api/getClassificationResult";
import type { ClassificationResultStatus } from "./api/getClassificationResult";
import { ClassificationApiError } from "./api/ClassificationApiError";
import { mergeClassificationResultIntoPost } from "./mapping/mergeClassificationResultIntoPost";
import { createLogger } from "@/shared/utils/createLogger";

const logger = createLogger("classification-update");

export async function updatePostWithClassificationResult(
  postSnapshotId: string,
): Promise<ClassificationResult> {
  logger.debug("postSnapshotId:", postSnapshotId);

  const post = await getPostSnapshotById(postSnapshotId);
  if (!post) {
    throw new Error(
      `Failed: PostSnapshot "${postSnapshotId}" not found in storage.`,
    );
  }
  const classificationJobId = post.classificationJobId;
  if (!classificationJobId) {
    throw new Error(
      `Failed: PostSnapshot "${postSnapshotId}" doesn't have a classificationJobId.`,
    );
  }

  logger.debug("Getting ClassificationResult from backend");
  let classificationResult: ClassificationResult;
  try {
    classificationResult = await getClassificationResult(classificationJobId);
  } catch (error) {
    if (
      error instanceof ClassificationApiError &&
      error.responseStatus === 404
    ) {
      console.warn(
        "updatePostWithClassificationResult - Classification job not found on backend for jobId:",
        classificationJobId,
        ". Marking as JOB_NOT_FOUND.",
      );
      post.classificationStatus = "JOB_NOT_FOUND";
      await updatePostSnapshot(post);
      return {
        id: classificationJobId,
        status: "FAILED" as ClassificationResultStatus,
        comments: null,
      };
    }
    throw error;
  }

  logger.debug("Merging ClassificationResult into PostSnapshot");
  const updatedPost = mergeClassificationResultIntoPost(
    post,
    classificationResult,
  );
  await updatePostSnapshot(updatedPost);
  return classificationResult;
}
