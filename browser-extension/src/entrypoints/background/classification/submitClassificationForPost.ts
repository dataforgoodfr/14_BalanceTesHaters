import {
  getPostSnapshotById,
  updatePostSnapshot,
} from "@/shared/storage/post-snapshot-storage";
import { mapPostToClassificationRequest } from "./mapping/mapPostToClassificationRequest";
import { postClassificationRequest } from "./api/submitClassificationRequest";

const postIdsBeingSubmitted = new Map<string, Promise<void>>();
export async function submitClassificationRequestForPost(
  postSnapshotId: string,
): Promise<void> {
  if (postIdsBeingSubmitted.has(postSnapshotId)) {
    // Already being submitted
    // await existing promise
    await postIdsBeingSubmitted.get(postSnapshotId);
  } else {
    try {
      const promise = doSubmitClassificationRequestForPost(postSnapshotId);
      postIdsBeingSubmitted.set(postSnapshotId, promise);
      await promise;
    } finally {
      postIdsBeingSubmitted.delete(postSnapshotId);
    }
  }
}

async function doSubmitClassificationRequestForPost(postSnapshotId: string) {
  console.debug(
    "submitClassificationRequestForPost - postSnapshotId:",
    postSnapshotId,
  );

  const post = await getPostSnapshotById(postSnapshotId);
  if (!post) {
    throw new Error(
      `Submit classification failed: PostSnapshot ${postSnapshotId} not found in storage`,
    );
  }
  if (post.classificationJobId) {
    throw new Error(
      `Submit classification failed: PostSnapshot ${postSnapshotId} already has a classificationJobId!!`,
    );
  }
  console.debug(
    "submitClassificationRequestForPost - Submitting postsnapshot to backend for classification",
  );
  const classificationJob = mapPostToClassificationRequest(post);
  const response = await postClassificationRequest(classificationJob);

  post.classificationJobId = response.job_id;
  post.classificationStatus = "SUBMITTED";

  await updatePostSnapshot(post);
}
