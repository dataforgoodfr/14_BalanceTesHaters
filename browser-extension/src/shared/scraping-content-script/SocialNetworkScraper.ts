import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import { ScrapingSupport } from "./ScrapingSupport";

export interface SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo>;

  scrapPagePost(scrapingSupport: ScrapingSupport): Promise<PostSnapshot>;
}
