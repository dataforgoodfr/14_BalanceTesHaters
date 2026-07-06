import { CommentSnapshot, PostSnapshot } from "@/shared/model/PostSnapshot";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger } from "@/shared/utils/createLogger";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { currentIsoDate } from "@/shared/utils/current-iso-date";
import {
  INVALID_TT_VIDEOURL,
  parseTiktokVideoUrl,
} from "./url/parseTiktokVideoUrl";
import { Author } from "@/shared/model/Author";
import { tiktokAccountHref } from "./url/tiktokAccountHref";
import { PublicationDate } from "@/shared/model/PublicationDate";

const logger = createLogger("[CS - TiktokPostScraper]");

export class TiktokPostScraper {
  public constructor(
    private scrapingSupport: ScrapingSupport,
    private progressManager: ProgressManager,
  ) {}

  async scrapPost(): Promise<PostSnapshot> {
    logger.debug("Start Scraping... ", document.URL);

    const url = document.URL;
    const result = parseTiktokVideoUrl(url);
    if (result === INVALID_TT_VIDEOURL) {
      throw new Error(INVALID_TT_VIDEOURL);
    }
    const scrapedAt = currentIsoDate();
    const id = crypto.randomUUID();
    const postId = result.postId;

    // TODO og:image is empty in tiktok find another way to get cover image
    const coverImageUrl = undefined;

    const author: Author = {
      name: result.accountId,
      accountHref: tiktokAccountHref(result.accountId),
    };

    const textContent =
      this.scrapingSupport.selectOrThrowMetaPropertyContent("og:description");

    // TODO find a way to get publishedAt.
    const publishedAt: PublicationDate = {
      type: "absolute",
      date: currentIsoDate(),
    };
    logger.debug("Post info extracted:", {
      coverImageUrl,
      author,
      textContent,
      publishedAt,
    });
    const comments: CommentSnapshot[] = await Promise.resolve([]);

    return {
      id,
      socialNetwork: SocialNetwork.TikTok,
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
