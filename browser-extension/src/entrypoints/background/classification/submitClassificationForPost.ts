import {
  getPostSnapshotById,
  updatePostSnapshot,
} from "@/shared/storage/post-snapshot-storage";
import { mapPostToClassificationRequest } from "./mapping/mapPostToClassificationRequest";
import { postClassificationRequest } from "./api/submitClassificationRequest";

export async function submitClassificationRequestForPost(
  postSnapshotId: string,
): Promise<boolean> {
  console.debug(
    "submitClassificationRequestForPost - postSnapshotId:",
    postSnapshotId,
  );

  const post = await getPostSnapshotById(postSnapshotId);
  if (!post) {
    console.warn("Post does not exist!! ignoring request");
    return false;
  }
  if (post.classificationJobId) {
    console.warn("Post already has some classificationJobId!!");
    return false;
  }
  console.debug("Background - Posting post to backend");
  try {
    const classificationJob = mapPostToClassificationRequest(post);
    const response = await postClassificationRequest(classificationJob);

    post.classificationJobId = response.job_id;
    post.classificationStatus = "SUBMITTED";

    await updatePostSnapshot(post);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
