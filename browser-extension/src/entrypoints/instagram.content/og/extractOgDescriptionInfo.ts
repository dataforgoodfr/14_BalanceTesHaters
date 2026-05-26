import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";

import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { AbsoluteDate, PublicationDate } from "@/shared/model/PublicationDate";
import { INSTAGRAM_URL } from "../instagramPageInfo";
export type InstagramOgDescriptionInfo = Pick<
  PostSnapshot,
  "publishedAt" | "textContent" | "author"
> & {
  // Restrict to absolute date
  publishedAt: AbsoluteDate;
} & {
  commentsCount: number;
};

export function extractOgDescriptionInfo(
  scrapingSupport: ScrapingSupport,
): InstagramOgDescriptionInfo {
  const element = scrapingSupport.selectOrThrow(
    document,
    "meta[property='og:description']",
    HTMLMetaElement,
  );
  const ogDescriptionContent = element.getAttribute("content");
  if (!ogDescriptionContent) {
    throw new Error("og:description is empty");
  }

  return parseOgDescriptionContent(ogDescriptionContent);
}

export function parseOgDescriptionContent(
  ogDescriptionContent: string,
): InstagramOgDescriptionInfo {
  // og:description is of the form
  // '<likesCount> likes, <commentsCount> comments - <accountName> le\u00A0 <dateFragment>: "<textContent>".'
  // Or
  // '<likesCount> likes, <commentsCount> comments - <accountName> on <dateFragment>: "<textContent>".'
  // Or
  // '<likesCount> likes, <commentsCount> comments - <accountName> on <dateFragment>'

  const regex =
    /^[0-9, ]+K? likes, (?<commentsCount>[0-9, ]+) comments - (?<accountName>\S+)\s+(?:(le)|(on))\s+(?<dateFragment>[^:]*)(?:: "(?<textContent>.*)"\.)?\s*/gms;

  const res = regex.exec(ogDescriptionContent);
  if (!res || !res.groups) {
    throw new Error(
      "Failed to extract ogDescriptionContent:\n" + ogDescriptionContent,
    );
  }
  const textContent = res.groups["textContent"] ?? "";
  const dateFragment = res.groups["dateFragment"];
  const accountName = res.groups["accountName"];
  const commentsCount = Number.parseInt(
    res.groups["commentsCount"].replaceAll(",", "").replaceAll(" ", ""),
  );
  const accountHref = `${INSTAGRAM_URL.origin}/${accountName}`;
  const publishedAt: PublicationDate = {
    type: "absolute",
    date: parseDateFragment(dateFragment),
  };
  return {
    textContent,
    publishedAt,
    author: {
      name: accountName,
      accountHref,
    },
    commentsCount,
  };
}
/**
 *
 * @param dateFragment in the form May 20, 2026 or October 11, 2023
 */
export function parseDateFragment(dateFragment: string): string {
  const parts = dateFragment.split(/\s+/);
  if (parts.length !== 3) {
    throw new Error(`Invalid date fragment format: ${dateFragment}`);
  }
  const [month, dayWithComma, year] = parts;
  const day = dayWithComma.replace(",", "");
  const monthNumber = monthToNumber(month);
  const dayNumber = parseInt(day, 10);
  const yearNumber = parseInt(year, 10);
  if (isNaN(monthNumber) || isNaN(dayNumber) || isNaN(yearNumber)) {
    throw new Error(`Invalid date fragment: ${dateFragment}`);
  }
  // Create date in UTC to avoid timezone issues
  const date = Date.UTC(yearNumber, monthNumber, dayNumber);
  return new Date(date).toISOString();
}

export function monthToNumber(month: string): number {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const index = months.indexOf(month);
  if (index === -1) {
    throw new Error(`Unknown month: ${month}`);
  }
  return index;
}
