import {
  getPostSnapshotById,
  updatePostSnapshot,
} from "@/shared/storage/post-snapshot-storage";
import { getClassificationResult } from "./api/getClassificationResult";
import { mergeClassificationResultIntoPost } from "./mapping/mergeClassificationResultIntoPost";

export async function updatePostWithClassificationResult(
  postSnapshotId: string,
): Promise<boolean> {
  console.debug(
    "updatePostWithClassificationResult - postSnapshotId:",
    postSnapshotId,
  );

  const post = await getPostSnapshotById(postSnapshotId);
  if (!post) {
    console.warn("Post does not exist!! ignoring request");
    return false;
  }
  const classificationJobId = post.classificationJobId;
  if (!classificationJobId) {
    console.warn("Post doesn't have a classificationJobId!!");
    return false;
  }
  try {
    console.debug("Getting ClassificationResult from backend");
    const result = await getClassificationResult(classificationJobId);

    const updatedPost = mergeClassificationResultIntoPost(post, result);
    await updatePostSnapshot(updatedPost);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
