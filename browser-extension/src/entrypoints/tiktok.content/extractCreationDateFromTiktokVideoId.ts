import { PublicationDate } from "@/shared/model/PublicationDate";

export function extractCreationDateFromTiktokVideoId(
  videoId: string,
): PublicationDate {
  // Tiktok video Id contain the publication date
  // See https://dfir.blog/tinkering-with-tiktok-timestamps/
  const first31Chars = BigInt(videoId).toString(2).slice(0, 31);
  const unixTimestamp = parseInt(first31Chars, 2);
  const creationDate = new Date(unixTimestamp * 1000);
  return {
    type: "absolute",
    date: creationDate.toISOString(),
  };
}
