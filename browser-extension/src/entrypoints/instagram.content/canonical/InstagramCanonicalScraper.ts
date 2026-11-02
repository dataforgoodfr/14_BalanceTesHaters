import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import type { ScrapingOutput } from "@/shared/scraping-content-script/SocialNetworkScraper";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import { InstagramCommentThreadsScraper } from "./InstagramCommentThreadsScraper";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { ogImageUrl } from "../og/ogImageUrl";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import { extractOgDescriptionInfo } from "../og/extractOgDescriptionInfo";
import type { ScrapableSocialNetworkPage } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { extractInstagramCommentsCount } from "./extractInstagramCommentsCount";

const logger = createLogger("ig-canonical", scrapingLogger);

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
    private output: ScrapingOutput,
    private skipScreenshoting: boolean = false,
    private scrapingMaxComments?: number,
  ) {}

  async scrapPost(): Promise<PostSnapshot> {
    logger.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const scrapedAt = currentIsoDate();
    const id = this.output.postSnapshotId;
    const postId = this.pageInfo.postId;

    logger.debug("Extracting og info... ");

    const coverImageUrl = await ogImageUrl(this.scrapingSupport);

    const { publishedAt, author, textContent } = extractOgDescriptionInfo(
      this.scrapingSupport,
    );
    const expectedCommentsCount = extractInstagramCommentsCount(
      this.scrapingSupport,
      document,
    );

    logger.debug("postInfo extracted:", {
      coverImageUrl,
      publishedAt,
      author,
      textContent,
      expectedCommentsCount,
    });

    logger.debug("Extracting comment threads... ");
    const comments = await new InstagramCommentThreadsScraper(
      this.scrapingSupport,
      this.progressManager,
      expectedCommentsCount,
      this.output.appendScreenshots,
      this.skipScreenshoting,
      this.scrapingMaxComments,
    ).scrapCommentThreads();

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
}
