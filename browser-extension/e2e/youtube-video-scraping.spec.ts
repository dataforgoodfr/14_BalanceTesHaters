import { test, expect } from "./fixtures";
import { waitForPostStored } from "./utils/waitForPostStored";
import { triggerYoutubeVideoScraping } from "./utils/triggerYoutubeVideoScraping";
import { CommentSnapshot } from "@/shared/model/PostSnapshot";

test.describe("YouTube Video Scraping", () => {
  test("Test scraping video", async ({ extensionId, context }) => {
    // Note: the scraping part (until the waitForPostStored)
    // should ideally be moved to a beforeAll
    // However this requires to figure out how to
    //  install extension before the beforeAll...
    const scrapTimeout = 5 * 60 * 1000;
    test.setTimeout(scrapTimeout);
    const youtubeVideoId = "bYnBcdxT7os";

    const triggerResult = await triggerYoutubeVideoScraping(
      extensionId,
      context,
      youtubeVideoId,
    );

    // Wait for analysis to end
    const post = await waitForPostStored(context, youtubeVideoId, scrapTimeout);

    // Test post values
    expect(post.postId).toEqual(youtubeVideoId);
    expect(post.url).toEqual(triggerResult.postUrl);
    expect(post.publishedAt).toEqual({
      type: "absolute",
      date: "2025-07-22T00:00:00.000Z",
    });
    expect(new Date(post.scrapedAt).getTime()).toBeLessThan(Date.now());

    // Check comments
    const topLevelComments = post.comments;
    const allComments = flatten(topLevelComments);

    // Test commentId captured
    const commentForId = topLevelComments.find((c) =>
      c.author.name.startsWith("@roots"),
    );
    expect(commentForId?.commentId).toBe("Ugx2oJk4syftWHsTpF54AaABAg");

    // Test emojis are captured
    const commentWithEmojis = topLevelComments.find((c) =>
      c.author.name.startsWith("@roots"),
    );
    expect(commentWithEmojis?.textContent).toContain("👏 👏");

    // Test long comment is fully captured
    const longComment = topLevelComments.find((c) =>
      c.author.name.startsWith("@lucilefo"),
    );
    expect(longComment?.textContent).toContain("quotidiennement.");

    // Test replies length match
    const commentWithRepliesAndLikes = topLevelComments.find((c) =>
      c.author.name.startsWith("@melH6"),
    );
    expect(commentWithRepliesAndLikes?.replies.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(commentWithRepliesAndLikes?.nbLikes).toBeGreaterThanOrEqual(82);

    // Test reply captured
    const reply = commentWithRepliesAndLikes?.replies.find((c) =>
      c.author.name.startsWith("@Natygam"),
    );
    expect(reply?.textContent).toContain("Comme je te comprends");

    // Test that total scraped comment count matches youtube displayed count
    const commentCountElement = await triggerResult.postPage.$(
      "#comments #count span:nth-of-type(1)",
    );
    const text = (await commentCountElement?.innerText()) || "0";
    const commentCount = Number.parseInt(text);
    expect(allComments.length).toBe(commentCount);
  });
});

function flatten(comments: CommentSnapshot[]): CommentSnapshot[] {
  return [...comments, ...comments.flatMap((c) => flatten(c.replies))];
}
