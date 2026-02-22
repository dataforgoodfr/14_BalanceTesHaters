import { test, expect } from "./fixtures";
import { waitForPostStored } from "./utils/waitForPostStored";
import { triggerYoutubeVideoScraping } from "./utils/triggerYoutubeVideoScraping";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";

test.describe("YouTube Video Scraping", () => {
  test("Test scraping video", async ({ extensionId, context }) => {
    const scrapTimeout = 5 * 60 * 1000;
    test.setTimeout(scrapTimeout);
    const youtubeVideoId = "bYnBcdxT7os";

    const triggerResult = await triggerYoutubeVideoScraping(
      extensionId,
      context,
      youtubeVideoId,
    );

    // Wait for analysis
    const post = await waitForPostStored(context, youtubeVideoId, scrapTimeout);

    expect(post.postId).toEqual(youtubeVideoId);
    expect(post.url).toEqual(triggerResult.postUrl);

    expect(new Date(post.scrapedAt).getTime()).toBeLessThan(Date.now());
    const allComments = flatten(post.comments);
    expect(allComments.length).toBeGreaterThanOrEqual(100);

    const commentWithEmojis = post.comments.find((c) =>
      c.author.name.startsWith("@roots"),
    );
    expect(commentWithEmojis?.textContent).toContain("👏 👏");

    const longComment = post.comments.find((c) =>
      c.author.name.startsWith("@lucilefo"),
    );
    // Test end of comment is captured
    expect(longComment?.textContent).toContain("quotidiennement.");

    const commentWithRepliesAndLikes = post.comments.find((c) =>
      c.author.name.startsWith("@melH6"),
    );
    expect(commentWithRepliesAndLikes?.replies.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(commentWithRepliesAndLikes?.nbLikes).toBeGreaterThanOrEqual(80);
  });
});

function flatten(comments: CommentSnapshot[]): CommentSnapshot[] {
  return [...comments, ...comments.flatMap((c) => flatten(c.replies))];
}
