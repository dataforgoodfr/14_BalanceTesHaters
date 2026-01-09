import { SocialNetworkName } from "@/entrypoints/shared/model/social-network-name";
import { PuppeteerBaseScraper } from "./puppeteer/puppeteer-base-scraper";
import { InstagramScraper } from "./instagram/instagram-scraper";
import { YoutubeScraper } from "./youtube/youtube-scraper";

export function createScraper(sn: SocialNetworkName): PuppeteerBaseScraper {
  switch (sn) {
    case "YOUTUBE":
      return new YoutubeScraper();
    case "INSTAGRAM":
      return new InstagramScraper();
  }
}
