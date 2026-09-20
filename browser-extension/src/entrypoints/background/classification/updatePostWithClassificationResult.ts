import {
  getPostSnapshotById,
  updatePostSnapshot,
} from "@/shared/storage/post-snapshot-storage";
import type { ClassificationResult } from "./api/getClassificationResult";
import { getClassificationResult } from "./api/getClassificationResult";
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
  const classificationResult =
    await getClassificationResult(classificationJobId);

  logger.debug("Merging ClassificationResult into PostSnapshot");
  const updatedPost = mergeClassificationResultIntoPost(
    post,
    classificationResult,
  );
  await updatePostSnapshot(updatedPost);
  return classificationResult;
}
