import { SocialNetworkName } from "./model/SocialNetworkName";

export const YOUTUBE_URL = new URL("https://www.youtube.com");
export const INSTAGRAM_URL = new URL("https://www.instagram.com");

export interface SocialNetworkUrlInfo {
  type: "post";
  socialNetwork: SocialNetworkName;
  postId: string;
}

export function parseSocialNetworkUrl(
  url: string,
): SocialNetworkUrlInfo | false {
  const parsed = URL.parse(url);
  if (!parsed) {
    return false;
  }
  // split ignoring first slash
  const pathElements = parsed.pathname.substring(1).split("/");
  if (
    parsed.hostname === YOUTUBE_URL.hostname &&
    parsed.pathname === "/watch"
  ) {
    const postId = parsed.searchParams.get("v");
    if (!postId) {
      return false;
    }
    return {
      type: "post",
      socialNetwork: "YOUTUBE",
      postId: postId,
    };
  }
  if (
    (parsed.hostname === INSTAGRAM_URL.hostname &&
      pathElements.length > 1 &&
      pathElements[0] === "p") ||
    pathElements[1] === "p"
  ) {
    return {
      type: "post",
      socialNetwork: "INSTAGRAM",
      postId: extractInstagramPostId(pathElements),
    };
  }
  return false;
}

function extractInstagramPostId(pathElements: string[]): string {
  // Url of style /<account>/p/<id>
  if (pathElements[0] === "p") {
    return pathElements[1];
  }
  // Url of style /p/<id>
  if (pathElements[1] === "p") {
    return pathElements[2];
  }
  throw new Error("unexpected url format");
}
