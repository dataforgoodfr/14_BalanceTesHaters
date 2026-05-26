import {
  ScrapPagePostResult,
  SocialNetworkScraper,
} from "@/shared/scraping-content-script/SocialNetworkScraper";
import { instagramPageInfo } from "./instagramPageInfo";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { createLogger } from "@/shared/utils/createLogger";
import { InstagramCanonicalScraper } from "./canonical";

const logger = createLogger("[CS - InstagramScraper]");

export class InstagramScraper implements SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return Promise.resolve(instagramPageInfo(document.URL));
  }

  async scrapPagePost(
    abortSignal: AbortSignal,
    progressManager: ProgressManager,
  ): Promise<ScrapPagePostResult> {
    const scrapingSupport = new ScrapingSupport(abortSignal);
    const documentUrlPageInfo = instagramPageInfo(document.URL);
    if (!documentUrlPageInfo.isScrapablePost) {
      throw new Error("Not scrapable");
    }
    const ogUrl = scrapingSupport.selectOrThrow(
      document,
      "meta[property='og:url']",
      HTMLMetaElement,
    ).content;
    const ogPageInfo = instagramPageInfo(ogUrl);

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

    // Instagram has (too) many ways of rendering posts and reels
    // reel urls can be
    // /<account>/reel/<reelid>/ - cannonical/og:url - Plain page - comments on the side
    // /reels/<reelid>/ => Plain page - comments in popup
    // /reel/<reelid>/ => url used when opened in modal mode from account page (reloading redirects to /reels/<reelid> with an s)
    // /p/<reelid>/ or /<account>/p/<reelid>/ - also worp for reels, renders as canonical url

    // Ensure cannonical url (og:url) and associated rendering is used
    if (document.URL !== ogUrl) {
      // Same post but not using the canonical url
      // reload using the canonical url (ogUrl)
      logger.info("Redirecting to canonical url", ogUrl);
      return {
        redirectUrl: ogUrl,
      };
    } else {
      logger.debug("Url is cannonical proceeding...");
    }

    return new InstagramCanonicalScraper(
      scrapingSupport,
      documentUrlPageInfo,
      progressManager,
    ).scrapPost();
  }
}
