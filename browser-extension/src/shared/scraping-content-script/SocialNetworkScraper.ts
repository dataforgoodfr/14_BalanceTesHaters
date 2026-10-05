import type { PostSnapshot } from "@/shared/model/PostSnapshot";
import type { ScrapingScreenshots } from "@/shared/model/scraping/ScrapingScreenshots";
import type { SocialNetworkPageInfo } from "./SocialNetworkPageInfo";
import type { ProgressManager } from "./ProgressManager";

export type SocialNetworkScraperSettings = {
  skipScreenshoting: boolean;
  scrapingMaxComments?: number;
};

export type ScrapingOutput = {
  postSnapshotId: string;
  appendScreenshots: (screenshots: ScrapingScreenshots) => Promise<void>;
};

export interface SocialNetworkScraper {
  getSocialNetworkPageInfo(): Promise<SocialNetworkPageInfo>;

  scrapPagePost(
    abortSignal: AbortSignal,
    progress: ProgressManager,
    output: ScrapingOutput,
    settings?: SocialNetworkScraperSettings,
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
