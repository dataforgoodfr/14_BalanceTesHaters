import { SocialNetworkScraper } from "@/shared/scraping-content-script/SocialNetworkScraper";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { youtubePageInfo } from "./youtubePageInfo";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { YoutubePostNativeScrapper } from "./youtube-post-native-scrapper";
import { ScrapingSupport } from "@/shared/scraping-content-script/ScrapingSupport";

export class YoutubeScraper implements SocialNetworkScraper {
  async getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return youtubePageInfo(document.URL);
  }

  async scrapPagePost(scrapingSupport: ScrapingSupport): Promise<PostSnapshot> {
    // Note by @sarod:
    // Code delegates to YoutubePostNativeScrapper rather than merge them in a single class
    // to minimize merge conflicts but these could be merged later
    return new YoutubePostNativeScrapper(scrapingSupport).scrapPost();
  }
}
