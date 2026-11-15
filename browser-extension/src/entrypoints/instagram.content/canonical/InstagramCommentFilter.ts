import type { CommentSnapshotWithScreenshot } from "@/shared/model/scraping/CommentSnapshotWithScreenshot";
import type { InstagramComment } from "./InstagramLoadedCommentScraper";
import type { InstagramCommentThread } from "./InstagramLoadedCommentThreadBatchScraper";

export class InstagramCommentFilter {
  private imageComments = 0;
  private imageReplies = 0;
  private facebookPlaceholders = 0;
  private facebookComments = 0;
  private textRepliesUnderFilteredParents = 0;

  filterThreads(
    threads: InstagramCommentThread[],
  ): CommentSnapshotWithScreenshot[] {
    return threads.flatMap(({ comment, replies }) => {
      const filteredReplies = this.filterReplies(
        replies,
        comment.type === "text",
      );
      if (comment.type === "text") {
        return [{ ...comment.data, replies: filteredReplies }];
      }
      if (comment.type === "image") this.imageComments++;
      else this.recordFacebookComments(comment.data.commentCount);
      return [];
    });
  }

  getStats() {
    const filteredInstagramComments =
      this.imageComments +
      this.imageReplies +
      this.textRepliesUnderFilteredParents;
    return {
      imageComments: this.imageComments,
      imageReplies: this.imageReplies,
      facebookPlaceholders: this.facebookPlaceholders,
      facebookComments: this.facebookComments,
      textRepliesUnderFilteredParents: this.textRepliesUnderFilteredParents,
      // A placeholder is one UI element representing multiple Facebook comments.
      totalFilteredElements:
        filteredInstagramComments + this.facebookPlaceholders,
      totalFilteredComments: filteredInstagramComments + this.facebookComments,
    };
  }

  private recordFacebookComments(commentCount: number): void {
    this.facebookPlaceholders++;
    this.facebookComments += commentCount;
  }

  private filterReplies(
    replies: InstagramComment[],
    keepTextReplies: boolean,
  ): CommentSnapshotWithScreenshot[] {
    return replies.flatMap((reply) => {
      if (reply.type === "image") this.imageReplies++;
      else if (reply.type === "fb-comments")
        this.recordFacebookComments(reply.data.commentCount);
      else if (!keepTextReplies) this.textRepliesUnderFilteredParents++;
      else return [{ ...reply.data, replies: [] }];
      return [];
    });
  }
}
