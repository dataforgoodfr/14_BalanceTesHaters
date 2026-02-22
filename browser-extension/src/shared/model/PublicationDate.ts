import { z } from "zod";

const RelativeDateSchema = z.object({
  type: z.literal("relative"),
  dateText: z.string(),
  resolvedDateRange: z.object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  }),
});
const AbsoluteDateSchema = z.object({
  type: z.literal("absolute"),
  date: z.iso.datetime(),
});
/**
 * Publication date can be absolute, relative or unknown
 * absolute publication date is not always available in the frontend
 * (e.g. Youtube gives relative date "3 months ago")
 */
export const PublicationDateSchema = z.discriminatedUnion("type", [
  RelativeDateSchema,
  AbsoluteDateSchema,
  z.object({
    type: z.literal("unknown date"),
    dateText: z.string(),
  }),
]);
export type AbsoluteDate = z.infer<typeof AbsoluteDateSchema>;

export type RelativeDate = z.infer<typeof RelativeDateSchema>;
export type PublicationDate = z.infer<typeof PublicationDateSchema>;
