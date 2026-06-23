import {
  ScrapPagePostResult,
  SocialNetworkScraper,
} from "@/shared/scraping-content-script/SocialNetworkScraper";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { youtubePageInfo } from "./youtubePageInfo";
import { YoutubePostNativeScrapper } from "./youtube-post-native-scrapper";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { createLogger } from "@/shared/utils/createLogger";

const logger = createLogger("[CS - YoutubeScraper]");

export class YoutubeScraper implements SocialNetworkScraper {
  /**
   *
   * @param allowDegradedScrapping try to still perform scrapping if youtube suspects bot at the risk of erroneous data. Usefull only for E2E test
   */
  constructor(private allowDegradedScrapping: boolean) {}

  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return Promise.resolve(youtubePageInfo(document.URL));
  }

  async scrapPagePost(
    abortSignal: AbortSignal,
    progressManager: ProgressManager,
  ): Promise<ScrapPagePostResult> {
    if (this.allowDegradedScrapping) {
      console.warn("allowDegradedScrapping=true. This is only for testing");
    }
    const scrapingSupport = new ScrapingSupport(abortSignal);
    const ogUrl = scrapingSupport.select(
      document,
      "meta[property='og:url']",
      HTMLMetaElement,
    )?.content;

    if (!ogUrl) {
      const message =
        "Failed to find og:url no way to check if og:metadata is out of sync.";
      if (this.allowDegradedScrapping) {
        logger.warn(message);
      } else {
        throw new Error(message);
      }
    } else if (isOutdatedOgMeta(ogUrl, document.URL)) {
      // Scraper uses og: meta information which are only loaded on page load not on navigation
      // Detect if out of sync by comparing ogUrl postId with current url postId
      logger.info("og metadata out of sync reloading page");
      return {
        redirectUrl: document.URL,
      };
    }

    return new YoutubePostNativeScrapper(
      scrapingSupport,
      this.allowDegradedScrapping,
    ).scrapPost(progressManager);
  }
}

function isOutdatedOgMeta(ogUrl: string, documentUrl: string): boolean {
  const documentUrlPageInfo = youtubePageInfo(documentUrl);
  if (!documentUrlPageInfo.isScrapablePost) {
    throw new Error("Document URL Not scrapable");
  }
  const ogPageInfo = youtubePageInfo(ogUrl);

  return (
    !ogPageInfo.isScrapablePost ||
    ogPageInfo.postId !== documentUrlPageInfo.postId
  );
}
