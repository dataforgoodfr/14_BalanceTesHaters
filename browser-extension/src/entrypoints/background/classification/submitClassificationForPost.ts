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
  console.debug(
    "submitClassificationRequestForPost - postSnapshotId:",
    postSnapshotId,
  );
  if (postIdsBeingSubmitted.has(postSnapshotId)) {
    console.debug(
      "submitClassificationRequestForPost - already submitted - waiting for existing promise",
    );
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

  console.debug(
    "submitClassificationRequestForPost - Updating post with classificationJobId and status SUBMITTED",
    response.job_id,
  );

  await updatePostSnapshot(post);
}
