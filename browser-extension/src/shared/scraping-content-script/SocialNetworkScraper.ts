import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import { ProgressManager } from "./ProgressManager";
export interface SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo>;

  scrapPagePost(
    abortSignal: AbortSignal,
    progress: ProgressManager,
  ): Promise<ScrapPagePostResult>;
}

export type ScrapPagePostResult = PostSnapshot | RequestRedirectAndScrap;

export type RequestRedirectAndScrap = {
  redirectUrl: string;
};

export function isRequestRedirectAndScrap(
  res: ScrapPagePostResult,
): res is RequestRedirectAndScrap {
  return "redirectUrl" in res;
}
