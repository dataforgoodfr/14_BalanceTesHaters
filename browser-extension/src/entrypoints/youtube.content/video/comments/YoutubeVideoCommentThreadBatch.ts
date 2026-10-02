export type YoutubeVideoCommentThreadRoot = Readonly<{
  commentId: string;
  element: HTMLElement;
}>;

export class YoutubeVideoCommentThreadBatch {
  constructor(readonly threadRoots: readonly YoutubeVideoCommentThreadRoot[]) {
    if (threadRoots.length === 0) {
      throw new Error("A comment thread batch cannot be empty.");
    }
  }
}
