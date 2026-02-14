import {
  getPostByIdAndScrapedAt,
  setPostClassificationJobId,
} from "@/shared/storage/posts-storage";
import { buildClassificationRequest } from "./buildClassificationRequest";
import { requestClassification } from "./api/requestClassification";

export async function requestClassificationForPost(
  postId: string,
  scrapedAt: string,
): Promise<boolean> {
  console.debug(
    "requestClassificationForPost - postId:",
    postId,
    "scrapedAt:",
    scrapedAt,
  );

  const post = await getPostByIdAndScrapedAt(postId, scrapedAt);
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
    const classificationJob = buildClassificationRequest(post);
    const response = await requestClassification(classificationJob);
    await setPostClassificationJobId(
      post.postId,
      post.scrapedAt,
      response.job_id,
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
