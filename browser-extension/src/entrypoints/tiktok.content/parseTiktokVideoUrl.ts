const tiktokHostName = "https://www.tiktok.com";

export const INVALID_TT_VIDEOURL = "INVALID_TIKTOK_VIDEO_URL" as const;

export function parseTiktokVideoUrl(tiktokUrl: string):
  | {
      accountId: string;
      postId: string;
    }
  | "INVALID_TIKTOK_VIDEO_URL" {
  const parsed = URL.parse(tiktokUrl);
  if (!parsed || parsed.hostname !== tiktokHostName) {
    return INVALID_TT_VIDEOURL;
  }
  const pathElements = parsed.pathname.substring(1).split("/").filter(Boolean);

  if (
    pathElements.length === 3 &&
    pathElements[0].startsWith("@") &&
    pathElements[1] === "video"
  ) {
    return {
      accountId: pathElements[0],
      postId: pathElements[2],
    };
  }
  return INVALID_TT_VIDEOURL;
}
