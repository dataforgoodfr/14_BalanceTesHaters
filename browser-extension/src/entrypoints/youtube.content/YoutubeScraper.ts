import type {
  ScrapPagePostResult,
  SocialNetworkScraper,
} from "@/shared/scraping-content-script/SocialNetworkScraper";
import type { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import type { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";
import { isYoutubeShortUrl } from "./url/isYoutubeShortUrl";
import { YoutubeVideoScraper } from "./video";
import { youtubePageInfo } from "./url/youtubePageInfo";
import { youtubeVideoUrl } from "./url/youtubeVideoUrl";

export class YoutubeScraper implements SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return Promise.resolve(youtubePageInfo(document.URL));
  }

  async scrapPagePost(
    abortSignal: AbortSignal,
    progressManager: ProgressManager,
  ): Promise<ScrapPagePostResult> {
    const scrapingSupport = new ScrapingSupport(abortSignal);
    const pageInfo = youtubePageInfo(document.URL);
    if (!pageInfo.isScrapablePost) {
      throw new Error(
        "Url does not match a scrapable yt page: " + document.URL,
      );
    }

    if (isYoutubeShortUrl(pageInfo.url)) {
      // Shorts can also be viewed as a videos.
      // Redirect to video url for short to allow reusing the same DOM layout & scraper
      return {
        redirectUrl: youtubeVideoUrl(pageInfo.postId),
      };
    } else {
      return await new YoutubeVideoScraper(
        scrapingSupport,
        pageInfo,
        progressManager,
      ).scrapPost();
    }
  }
}
