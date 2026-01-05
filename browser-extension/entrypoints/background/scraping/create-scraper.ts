import { SocialNetworkName } from "@/entrypoints/shared/social-network-url";
import { BaseScraper } from "./base-scraper";
import { InstagramScraper } from "./instagram/instagram-scraper";
import { YoutubeScraper } from "./youtube/youtube-scraper";

export function createScraper(sn: SocialNetworkName): BaseScraper {
  switch (sn) {
    case "youtube":
      return new YoutubeScraper();
    case "instagram":
      return new InstagramScraper();
  }
}
