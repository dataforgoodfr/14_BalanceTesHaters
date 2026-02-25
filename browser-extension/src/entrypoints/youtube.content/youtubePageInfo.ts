import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
export const YOUTUBE_URL = new URL("https://www.youtube.com");

export function youtubePageInfo(url: string): SocialNetworkPageInfo {
  const parsed = URL.parse(url);

  if (
    parsed &&
    parsed.hostname === YOUTUBE_URL.hostname &&
    parsed.pathname === "/watch"
  ) {
    const postId = parsed.searchParams.get("v");
    if (!postId) {
      return {
        isScrapablePost: false,
      };
    }
    return {
      isScrapablePost: true,
      socialNetwork: "YOUTUBE",
      postId: postId,
    };
  }

  return {
    isScrapablePost: false,
  };
}
