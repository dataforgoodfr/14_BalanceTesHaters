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
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return Promise.resolve(youtubePageInfo(document.URL));
  }

  async scrapPagePost(
    abortSignal: AbortSignal,
    progressManager: ProgressManager,
  ): Promise<ScrapPagePostResult> {
    const scrapingSupport = new ScrapingSupport(abortSignal);
    const ogUrl = scrapingSupport.select(
      document,
      "meta[property='og:url']",
      HTMLMetaElement,
    )?.content;

    if (!ogUrl) {
      // This happens in E2E test when not logged in and youtube suspects bot.
      logger.warn(
        "Failed to find og:url no way to check if og:metadata is out of sync.",
      );
    } else if (isOutdatedOgMeta(ogUrl, document.URL)) {
      // Scraper uses og: meta information which are only loaded on page load not on navigation
      // Detect if out of sync by comparing ogUrl postId with current url postId
      logger.info("og metadata out of sync reloading page");
      return {
        redirectUrl: document.URL,
      };
    }

    return new YoutubePostNativeScrapper(scrapingSupport).scrapPost(
      progressManager,
    );
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
