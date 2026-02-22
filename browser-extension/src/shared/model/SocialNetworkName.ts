import { z } from "zod";

// SocialNetworkName Schema
export const SocialNetworkNameSchema = z.enum(["YOUTUBE", "INSTAGRAM"]);
export type SocialNetworkName = z.infer<typeof SocialNetworkNameSchema>;
