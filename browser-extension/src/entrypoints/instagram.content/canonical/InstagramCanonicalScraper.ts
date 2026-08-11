import type {
  CommentSnapshot,
  PostSnapshot,
} from "@/shared/model/PostSnapshot";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { InstagramCommentThreadsScraper } from "./InstagramCommentThreadsScraper";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { ogImageUrl } from "../og/ogImageUrl";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { extractOgDescriptionInfo } from "../og/extractOgDescriptionInfo";
import type { ScrapableSocialNetworkPage } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import type { InstagramCommentThread } from "./InstagramLoadedCommentThreadsScraper";
import type {
  InstagramComment,
  InstagramTextComment,
} from "./InstagramLoadedCommentScraper";

const logger = createLogger("[CS - InstagramCanonicalScraper]");

/**
 * Scrap an Instagram Post or Reel that is opened using its canonical url & rendering
 * /<accountName>/reels/<reelid>
 * /<accountName>/p/<postId>
 * (with comments side content and non modal).
 * Caller is responsible from ensuring canonical url is used and og meta is in sync.
 */
export class InstagramCanonicalScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private pageInfo: ScrapableSocialNetworkPage,
    private progressManager: ProgressManager,
  ) {}

  async scrapPost(): Promise<PostSnapshot> {
    logger.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const scrapedAt = currentIsoDate();
    const id = crypto.randomUUID();
    const postId = this.pageInfo.postId;

    logger.debug("Extracting og info... ");

    const coverImageUrl = await ogImageUrl(this.scrapingSupport);

    const {
      publishedAt,
      author,
      textContent,
      commentsCount: expectedCommentsCount,
    } = extractOgDescriptionInfo(this.scrapingSupport);

    logger.debug("og info extracted:", {
      coverImageUrl,
      publishedAt,
      author,
      textContent,
      expectedCommentsCount,
    });

    logger.debug("Extracting comment threads... ");
    const instagramCommentThreads = await new InstagramCommentThreadsScraper(
      this.scrapingSupport,
      this.progressManager,
      expectedCommentsCount,
    ).scrapCommentThreads();

    const comments = this.mapToCommentSnapshots(instagramCommentThreads);

    return {
      id,
      socialNetwork: SocialNetwork.Instagram,
      postId,
      author,
      publishedAt,
      textContent,
      scrapedAt,
      url,
      coverImageUrl,
      comments,
    };
  }

  private mapToCommentSnapshots(
    instagramCommentThreads: InstagramCommentThread[],
  ): CommentSnapshot[] {
    const commentSnapshots = instagramCommentThreads
      .map((ict) => {
        if (ict.comment.type !== "text") {
          // Remove non text comment
          return undefined;
        }

        const commentSnapshot: CommentSnapshot = {
          ...ict.comment.data,
          replies: this.mapRepliesToCommentSnapshots(ict.replies),
        };
        return commentSnapshot;
      })
      .filter((c) => c !== undefined);
    return commentSnapshots;
  }

  private mapRepliesToCommentSnapshots(
    instagramCommentReplies: InstagramComment[],
  ): CommentSnapshot[] {
    return instagramCommentReplies
      .filter((r) => r.type === "text")
      .map((r: InstagramTextComment) => ({
        ...r.data,
        // Only one level of replies in Instagram
        replies: [],
      }));
  }
}
