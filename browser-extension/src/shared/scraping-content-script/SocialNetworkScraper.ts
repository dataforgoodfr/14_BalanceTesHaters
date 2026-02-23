import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";

export interface SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo>;

  scrapPagePost(): Promise<PostSnapshot>;
}
