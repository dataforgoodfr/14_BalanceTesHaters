import { SocialNetworkName } from "@/entrypoints/shared/model/social-network-name";
import { InstagramScraper } from "./instagram/instagram-scraper";
import { YoutubeScraper } from "./youtube/youtube-scraper";
import { YoutubeNativeScraper } from "./youtube-native/youtube-native-scraper";
import { Scraper } from "./scraper";

const usePuppeteer = false;
export function createScraper(sn: SocialNetworkName): Scraper {
  switch (sn) {
    case "YOUTUBE":
      if (usePuppeteer) {
        return new YoutubeScraper();
      } else {
        return new YoutubeNativeScraper();
      }

    case "INSTAGRAM":
      return new InstagramScraper();
  }
}
