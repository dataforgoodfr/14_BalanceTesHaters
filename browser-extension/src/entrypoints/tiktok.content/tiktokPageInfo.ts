import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { SocialNetworkPageInfo } from "@/shared/scraping-content-script/SocialNetworkPageInfo";
import {
  INVALID_TT_VIDEOURL,
  parseTiktokVideoUrl,
} from "./parseTiktokVideoUrl";

export function tiktokPageInfo(url: string): SocialNetworkPageInfo {
  const parseResult = parseTiktokVideoUrl(url);

  if (parseResult === INVALID_TT_VIDEOURL) {
    return { isScrapablePost: false };
  } else {
    return {
      socialNetwork: SocialNetwork.TikTok,
      isScrapablePost: true,
      postId: parseResult.postId,
    };
  }
}
