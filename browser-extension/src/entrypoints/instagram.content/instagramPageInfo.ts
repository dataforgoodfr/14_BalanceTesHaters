import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";

export const INSTAGRAM_URL = new URL("https://www.instagram.com");
const POST_ROUTE_SEGMENTS = new Set(["p", "reel", "reels"]);

export function instagramPageInfo(url: string): SocialNetworkPageInfo {
  const parsed = URL.parse(url);
  if (!parsed || parsed.hostname !== INSTAGRAM_URL.hostname) {
    return {
      isScrapablePost: false,
    };
  }
  const pathElements = parsed.pathname.substring(1).split("/").filter(Boolean);

  if (
    pathElements.length === 2 &&
    POST_ROUTE_SEGMENTS.has(pathElements[0]) &&
    Boolean(pathElements[1])
  ) {
    // Url of style /p/<id>, /reel/<id> or /reels/<id>
    const id = pathElements[1];
    return {
      isScrapablePost: true,
      socialNetwork: SocialNetwork.Instagram,
      postId: id,
    };
  }
  if (
    pathElements.length === 3 &&
    POST_ROUTE_SEGMENTS.has(pathElements[1]) &&
    Boolean(pathElements[2])
  ) {
    // Url of style /<account>/p/<id> or /<account>/reel/<id>
    const id = pathElements[2];
    return {
      isScrapablePost: true,
      socialNetwork: SocialNetwork.Instagram,
      postId: id,
    };
  }

  return {
    isScrapablePost: false,
  };
}
