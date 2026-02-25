import { SocialNetworkName } from "@/shared/model/SocialNetworkName";

export type SocialNetworkPageInfo =
  | {
      isScrapablePost: true;
      socialNetwork: SocialNetworkName;
      postId: string;
    }
  | {
      isScrapablePost: false;
    };
