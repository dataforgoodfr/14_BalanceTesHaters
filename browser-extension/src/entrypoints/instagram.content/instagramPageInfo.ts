import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";

export const INSTAGRAM_URL = new URL("https://www.instagram.com");

export function instagramPageInfo(url: string): SocialNetworkPageInfo {
  const parsed = URL.parse(url);
  if (!parsed || parsed.hostname !== INSTAGRAM_URL.hostname) {
    return {
      isScrapablePost: false,
    };
  }
  const pathElements = parsed.pathname.substring(1).split("/");

  if (pathElements.length > 1 && pathElements[0] === "p") {
    // Url of style /p/<id>
    const id = pathElements[1];
    return {
      isScrapablePost: true,
      socialNetwork: "INSTAGRAM",
      postId: id,
    };
  }
  if (pathElements.length > 2 && pathElements[1] === "p") {
    // Url of style /<account>/p/<id>
    const id = pathElements[2];
    return {
      isScrapablePost: true,
      socialNetwork: "INSTAGRAM",
      postId: id,
    };
  }

  return {
    isScrapablePost: false,
  };
}
