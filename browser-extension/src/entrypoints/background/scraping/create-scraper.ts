import { SocialNetworkName } from "@/shared/model/SocialNetworkName";
import { InstagramNativeScraper } from "./instagram-native/instagram-native-scraper";
import { YoutubeNativeScraper } from "./youtube-native/youtube-native-scraper";
import { Scraper } from "./scraper";

export function createScraper(sn: SocialNetworkName): Scraper {
  switch (sn) {
    case "YOUTUBE":
      return new YoutubeNativeScraper();

    case "INSTAGRAM":
      return new InstagramNativeScraper();
  }
}
