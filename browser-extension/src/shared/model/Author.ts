import { z } from "zod";

// Author Schema
export type Author = z.infer<typeof AuthorSchema>;

export const AuthorSchema = z.object({
  name: z.string(),
  accountHref: z.string(),
});
