import { SocialNetworkName } from "@/shared/model/SocialNetworkName";

export type SocialNetworkPageInfo =
  | ScrapableSocialNetworkPage
  | {
      isScrapablePost: false;
    };

export type ScrapableSocialNetworkPage = {
  isScrapablePost: true;
  socialNetwork: SocialNetworkName;
  postId: string;
};
