import type { PostScrapingResult } from "@/shared/model/PostScrapingResult";
import type { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import type { ProgressManager } from "./ProgressManager";

export type SocialNetworkScraperSettings = {
  skipScreenshoting: boolean;
  scrapingMaxComments?: number;
};

export interface SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo>;

  scrapPagePost(
    abortSignal: AbortSignal,
    progress: ProgressManager,
    settings?: SocialNetworkScraperSettings,
  ): Promise<ScrapPagePostResult>;
}

export type ScrapPagePostResult = PostScrapingResult | RequestRedirectAndScrap;

export type RequestRedirectAndScrap = {
  redirectUrl: string;
};

export function isRequestRedirectAndScrap(
  res: ScrapPagePostResult,
): res is RequestRedirectAndScrap {
  return "redirectUrl" in res;
}
