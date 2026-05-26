import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";

export function ogImageUrl(
  scrapingSupport: ScrapingSupport,
): string | undefined {
  const element = scrapingSupport.select(
    document,
    "meta[property='og:image']",
    HTMLElement,
  );
  return element?.getAttribute("content") ?? undefined;
}
