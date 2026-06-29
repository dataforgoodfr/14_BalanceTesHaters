import { z } from "zod";

// SocialNetworkName Schema
export enum SocialNetwork {
  YouTube = "YOUTUBE",
  Instagram = "INSTAGRAM",
  TikTok = "TIKTOK",
}
export const SocialNetworkNameSchema = z.enum([
  SocialNetwork.YouTube,
  SocialNetwork.Instagram,
  SocialNetwork.TikTok,
]);
export type SocialNetworkName = z.infer<typeof SocialNetworkNameSchema>;
