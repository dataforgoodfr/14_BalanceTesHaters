import {
  getPostSnapshotById,
  updatePostSnapshot,
} from "@/shared/storage/post-snapshot-storage";
import { getClassificationResult } from "./api/getClassificationResult";
import { mergeClassificationResultIntoPost } from "./mapping/mergeClassificationResultIntoPost";

export async function updatePostWithClassificationResult(
  postSnapshotId: string,
): Promise<void> {
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
  const classificationResult =
    await getClassificationResult(classificationJobId);

  console.debug(
    "updatePostWithClassificationResult - merging ClassificationResult into PostSnapshot",
  );
  const updatedPost = mergeClassificationResultIntoPost(
    post,
    classificationResult,
  );
  await updatePostSnapshot(updatedPost);
}
