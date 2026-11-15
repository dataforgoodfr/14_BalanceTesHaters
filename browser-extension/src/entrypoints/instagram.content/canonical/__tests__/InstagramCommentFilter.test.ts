import { describe, expect, it } from "vitest";
import { InstagramCommentFilter } from "../InstagramCommentFilter";
import type {
  InstagramTextComment,
  InstagramImageComment,
  FacebookCommentsPlaceholder,
} from "../InstagramLoadedCommentScraper";

const common = {
  id: "comment",
  scrapedAt: "2026-11-15T00:00:00.000Z",
  author: { name: "author", accountHref: "https://www.instagram.com/author/" },
  nbLikes: 0,
  screenshotData: "screenshot",
};
const text: InstagramTextComment = {
  type: "text",
  data: {
    ...common,
    commentId: "123",
    url: "https://www.instagram.com/p/post/c/123/",
    textContent: "text",
    publishedAt: { type: "absolute", date: "2026-11-15T00:00:00.000Z" },
  },
};
const image: InstagramImageComment = {
  type: "image",
  data: { ...common, imageSrc: "https://example.com/image.gif" },
};
const facebook: FacebookCommentsPlaceholder = {
  type: "fb-comments",
  data: { commentCount: 6 },
};

describe("InstagramCommentFilter", () => {
  it("counts all excluded elements once, including replies under excluded parents", () => {
    const filter = new InstagramCommentFilter();
    expect(
      filter.filterThreads([
        { comment: text, replies: [text, image, facebook] },
        { comment: image, replies: [text, image] },
        { comment: facebook, replies: [text] },
      ]),
    ).toEqual([{ ...text.data, replies: [{ ...text.data, replies: [] }] }]);
    expect(filter.getStats()).toEqual({
      imageComments: 1,
      imageReplies: 2,
      facebookPlaceholders: 2,
      facebookComments: 12,
      textRepliesUnderFilteredParents: 2,
      totalFilteredElements: 7,
      totalFilteredComments: 17,
    });
  });

  it("accumulates statistics across batches and resets for a new scrape", () => {
    const filter = new InstagramCommentFilter();
    filter.filterThreads([
      { comment: image, replies: [] },
      { comment: { ...facebook, data: { commentCount: 5 } }, replies: [] },
    ]);
    filter.filterThreads([
      {
        comment: text,
        replies: [image, { ...facebook, data: { commentCount: 3 } }],
      },
    ]);
    expect(filter.getStats()).toMatchObject({
      imageComments: 1,
      imageReplies: 1,
      facebookPlaceholders: 2,
      facebookComments: 8,
      totalFilteredElements: 4,
      totalFilteredComments: 10,
    });
    expect(new InstagramCommentFilter().getStats()).toMatchObject({
      facebookComments: 0,
      totalFilteredElements: 0,
      totalFilteredComments: 0,
    });
  });
});
