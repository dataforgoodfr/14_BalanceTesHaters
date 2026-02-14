import {
  getPostByIdAndScrapedAt,
  upsertPost,
} from "@/shared/storage/posts-storage";
import { getClassificationResult } from "./api/getClassificationResult";
import { mergeClassificationResultIntoPost } from "./mapping/mergeClassificationResultIntoPost";

export async function updatePostWithClassificationResult(
  postId: string,
  scrapedAt: string,
): Promise<boolean> {
  console.debug(
    "updatePostWithClassificationResult - postId:",
    postId,
    "scrapedAt:",
    scrapedAt,
  );

  const post = await getPostByIdAndScrapedAt(postId, scrapedAt);
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
    await upsertPost(updatedPost);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
