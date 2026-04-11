import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
export const YOUTUBE_URL = new URL("https://www.youtube.com");

export function youtubePageInfo(url: string): SocialNetworkPageInfo {
  const parsed = URL.parse(url);

  if (!parsed || parsed.hostname !== YOUTUBE_URL.hostname) {
    return {
      isScrapablePost: false,
    };
  }

  if (parsed.pathname === "/watch") {
    const postId = parsed.searchParams.get("v");
    if (!postId) {
      return {
        isScrapablePost: false,
      };
    }
    return {
      isScrapablePost: true,
      socialNetwork: SocialNetwork.YouTube,
      postId: postId,
    };
  }

  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  if (pathSegments[0] === "shorts" && pathSegments.length === 2) {
    const postId = pathSegments[1];
    return {
      isScrapablePost: true,
      socialNetwork: SocialNetwork.YouTube,
      postId,
    };
  }

  return {
    isScrapablePost: false,
  };
}
