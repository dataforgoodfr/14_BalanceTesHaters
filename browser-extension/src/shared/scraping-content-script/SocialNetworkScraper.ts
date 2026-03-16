import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import { ProgressManager } from "./ProgressManager";
export interface SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo>;

  scrapPagePost(
    abortSignal: AbortSignal,
    progress: ProgressManager,
  ): Promise<PostSnapshot>;
}
