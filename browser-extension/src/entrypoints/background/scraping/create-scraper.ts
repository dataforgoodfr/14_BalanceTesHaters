import { SocialNetworkName } from "@/shared/model/social-network-name";
import { InstagramScraper } from "./instagram/instagram-scraper";
import { YoutubeNativeScraper } from "./youtube-native/youtube-native-scraper";
import { Scraper } from "./scraper";

export function createScraper(sn: SocialNetworkName): Scraper {
  switch (sn) {
    case "YOUTUBE":
      return new YoutubeNativeScraper();

    case "INSTAGRAM":
      return new InstagramScraper();
  }
}
