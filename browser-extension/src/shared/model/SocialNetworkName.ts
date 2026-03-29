import { z } from "zod";

// SocialNetworkName Schema
export enum SocialNetwork {
  YouTube = "YOUTUBE",
  Instagram = "INSTAGRAM",
}
export const SocialNetworkNameSchema = z.enum([
  SocialNetwork.YouTube,
  SocialNetwork.Instagram,
]);
export type SocialNetworkName = z.infer<typeof SocialNetworkNameSchema>;
