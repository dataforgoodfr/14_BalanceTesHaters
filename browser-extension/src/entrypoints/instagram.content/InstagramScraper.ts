import { SocialNetworkScraper } from "@/shared/scraping-content-script/SocialNetworkScraper";
import { instagramPageInfo } from "./instagramPageInfo";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { InstagramPostNativeScraper } from "./instagram-post-native-scraper";
import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { ProgressManager } from "@/shared/scraping-content-script/ProgressManager";

export class InstagramScraper implements SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return Promise.resolve(instagramPageInfo(document.URL));
  }

  async scrapPagePost(
    abortSignal: AbortSignal,
    _: ProgressManager,
  ): Promise<PostSnapshot> {
    // Note by @sarod:
    // Code delegates to InstagramPostNativeScraper rather than merge them in a single class
    // to minimize merge conflicts but these could be merged later
    const scrapingSupport = new ScrapingSupport(abortSignal);
    return new InstagramPostNativeScraper(scrapingSupport).scrapPost();
  }
}
