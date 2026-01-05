export type SocialNetworkName = "youtube" | "instagram";

export interface SocialNetworkUrlInfo {
  type: "post";
  socialNetwork: SocialNetworkName;
  postId: string;
}

export function parseSocialNetworkUrl(
  url: string
): SocialNetworkUrlInfo | false {
  const parsed = URL.parse(url);
  console.log(url, parsed);
  if (!parsed) {
    return false;
  }
  // split ignoring first slash
  const pathElements = parsed.pathname.substring(1).split("/");
  console.log(url, parsed, pathElements);
  if (parsed.hostname === "www.youtube.com" && parsed.pathname === "/watch") {
    const postId = parsed.searchParams.get("v");
    if (!postId) {
      return false;
    }
    return {
      type: "post",
      socialNetwork: "youtube",
      postId: postId,
    };
  }
  if (
    parsed.hostname === "www.instagram.com" &&
    pathElements.length > 1 &&
    pathElements[0] === "p"
  ) {
    return {
      type: "post",
      socialNetwork: "instagram",
      postId: pathElements[1],
    };
  }
  return false;
}
