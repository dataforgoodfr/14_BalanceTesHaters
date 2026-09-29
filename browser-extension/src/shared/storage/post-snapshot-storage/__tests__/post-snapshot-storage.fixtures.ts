import type { PostSnapshot } from "../../../model/PostSnapshot";
import type { PostScrapingResult } from "../../../model/PostScrapingResult";
import { SocialNetwork } from "../../../model/SocialNetworkName";

export const POST_SNAPSHOT_ID = "11111111-1111-4111-8111-111111111111";
export const COMMENT_ID = "22222222-2222-4222-8222-222222222222";
export const REPLY_ID = "33333333-3333-4333-8333-333333333333";
export const SCREENSHOT_DATA = "dGVzdA==";
export const REPLY_SCREENSHOT_DATA = "cmVwbHk=";

export function scrapingResult(): PostScrapingResult {
  return {
    postSnapshot: snapshot(),
    screenshots: {
      [COMMENT_ID]: SCREENSHOT_DATA,
      [REPLY_ID]: REPLY_SCREENSHOT_DATA,
    },
  };
}

export function snapshot(): PostSnapshot {
  return {
    id: POST_SNAPSHOT_ID,
    postId: "post-id",
    socialNetwork: SocialNetwork.YouTube,
    url: "https://www.youtube.com/watch?v=post-id",
    publishedAt: {
      type: "absolute",
      date: "2026-01-01T00:00:00.000Z",
    },
    author: {
      name: "Post author",
      accountHref: "https://www.youtube.com/@post-author",
    },
    scrapedAt: "2026-01-02T00:00:00.000Z",
    comments: [
      {
        id: COMMENT_ID,
        commentId: "platform-comment-id",
        textContent: "Comment",
        author: {
          name: "Comment author",
          accountHref: "https://www.youtube.com/@comment-author",
        },
        publishedAt: {
          type: "absolute",
          date: "2026-01-01T01:00:00.000Z",
        },
        scrapedAt: "2026-01-02T00:00:00.000Z",
        nbLikes: 1,
        replies: [
          {
            id: REPLY_ID,
            commentId: "platform-reply-id",
            textContent: "Reply",
            author: {
              name: "Reply author",
              accountHref: "https://www.youtube.com/@reply-author",
            },
            publishedAt: {
              type: "absolute",
              date: "2026-01-01T02:00:00.000Z",
            },
            scrapedAt: "2026-01-02T00:00:00.000Z",
            nbLikes: 0,
            replies: [],
          },
        ],
      },
    ],
  };
}
