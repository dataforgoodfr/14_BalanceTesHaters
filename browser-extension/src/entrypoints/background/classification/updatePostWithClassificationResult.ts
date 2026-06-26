import {
  getPostSnapshotById,
  updatePostSnapshot,
} from "@/shared/storage/post-snapshot-storage";
import {
  ClassificationResult,
  ClassificationResultStatus,
  getClassificationResult,
} from "./api/getClassificationResult";
import { ClassificationApiError } from "./api/ClassificationApiError";
import { mergeClassificationResultIntoPost } from "./mapping/mergeClassificationResultIntoPost";

export async function updatePostWithClassificationResult(
  postSnapshotId: string,
): Promise<ClassificationResult> {
  console.debug(
    "updatePostWithClassificationResult - postSnapshotId:",
    postSnapshotId,
  );

  const post = await getPostSnapshotById(postSnapshotId);
  if (!post) {
    throw new Error(
      `updatePostWithClassificationResult failed: PostSnapshot "${postSnapshotId}" not found in storage.`,
    );
  }
  const classificationJobId = post.classificationJobId;
  if (!classificationJobId) {
    throw new Error(
      `updatePostWithClassificationResult failed: PostSnapshot "${postSnapshotId}" doesn't have a classificationJobId.`,
    );
  }

  console.debug(
    "updatePostWithClassificationResult - Getting ClassificationResult from backend",
  );
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

  console.debug(
    "updatePostWithClassificationResult - merging ClassificationResult into PostSnapshot",
  );
  const updatedPost = mergeClassificationResultIntoPost(
    post,
    classificationResult,
  );
  await updatePostSnapshot(updatedPost);
  return classificationResult;
}
