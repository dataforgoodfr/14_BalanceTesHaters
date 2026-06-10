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
    const documentUrlPageInfo = youtubePageInfo(document.URL);
    if (!documentUrlPageInfo.isScrapablePost) {
      throw new Error("Not scrapable");
    }
    const scrapingSupport = new ScrapingSupport(abortSignal);
    const ogUrl = scrapingSupport.selectOrThrow(
      document,
      "meta[property='og:url']",
      HTMLMetaElement,
    ).content;
    const ogPageInfo = youtubePageInfo(ogUrl);

    // Scraper uses og: meta information which are only loaded on page load not on navigation
    // Detect if out of sync by comparing ogUrl postId with current url postId
    if (
      !ogPageInfo.isScrapablePost ||
      ogPageInfo.postId !== documentUrlPageInfo.postId
    ) {
      logger.info("og metadata out of sync reloading page");
      return {
        redirectUrl: document.URL,
      };
    }

    // Note by @sarod:
    // Code delegates to YoutubePostNativeScrapper rather than merge them in a single class
    // to minimize merge conflicts but these could be merged later
    return new YoutubePostNativeScrapper(scrapingSupport).scrapPost(
      progressManager,
    );
  }
}
