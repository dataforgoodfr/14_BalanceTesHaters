import { SocialNetworkScraper } from "@/shared/scraping-content-script/SocialNetworkScraper";
import { instagramPageInfo } from "./instagramPageInfo";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { InstagramPostNativeScraper } from "./instagram-post-native-scraper";

export class InstagramScraper implements SocialNetworkScraper {
  async getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo> {
    return instagramPageInfo(document.URL);
  }

  async scrapPagePost(): Promise<PostSnapshot> {
    // Note by @sarod:
    // Code delegates to InstagramPostNativeScraper rather than merge them in a single class
    // to minimize merge conflicts but these could be merged later
    return new InstagramPostNativeScraper().scrapPost();
  }
}
