import { SocialNetworkName } from "@/entrypoints/shared/model/social-network-name";
import { BaseScraper } from "./base-scraper";
import { InstagramScraper } from "./instagram/instagram-scraper";
import { YoutubeScraper } from "./youtube/youtube-scraper";

export function createScraper(sn: SocialNetworkName): BaseScraper {
  switch (sn) {
    case "YOUTUBE":
      return new YoutubeScraper();
    case "INSTAGRAM":
      return new InstagramScraper();
  }
}
