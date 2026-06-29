import {
  ScrapPagePostResult,
  SocialNetworkScraper,
} from "@/shared/scraping-content-script/SocialNetworkScraper";
import { tiktokPageInfo } from "./tiktokPageInfo";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { createLogger } from "@/shared/utils/createLogger";
import { TiktokPostScraper } from "./TiktokPostScraper";

const logger = createLogger("[CS - TiktokScraper]");

export class TiktokScraper implements SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return Promise.resolve(tiktokPageInfo(document.URL));
  }

  async scrapPagePost(
    abortSignal: AbortSignal,
    progressManager: ProgressManager,
  ): Promise<ScrapPagePostResult> {
    const scrapingSupport = new ScrapingSupport(abortSignal);
    const documentUrlPageInfo = tiktokPageInfo(document.URL);
    if (!documentUrlPageInfo.isScrapablePost) {
      throw new Error("Not scrapable");
    }

    const ogUrl = getMetaContent(scrapingSupport, "og:url");
    const ogPageInfo = ogUrl ? tiktokPageInfo(ogUrl) : undefined;

    if (
      ogPageInfo &&
      (!ogPageInfo.isScrapablePost ||
        ogPageInfo.postId !== documentUrlPageInfo.postId)
    ) {
      logger.info("og metadata out of sync reloading page");
      return { redirectUrl: document.URL };
    }

    if (ogUrl && document.URL !== ogUrl) {
      logger.info("Redirecting to canonical url", ogUrl);
      return { redirectUrl: ogUrl };
    }

    return new TiktokPostScraper(scrapingSupport, progressManager).scrapPost();
  }
}

function getMetaContent(
  scrapingSupport: ScrapingSupport,
  metaPropertyName: string,
) {
  return scrapingSupport.select(
    document,
    `meta[property='${metaPropertyName}']`,
    HTMLMetaElement,
  )?.content;
}
