import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { fetchUrlContentAsDataUrl } from "../../../shared/scraping/fetchUrlContentAsDataUrl";

export async function ogImageUrl(
  scrapingSupport: ScrapingSupport,
): Promise<string | undefined> {
  const url = scrapingSupport.selectMetaPropertyContent("og:image");

  if (!url) return undefined;

  return fetchUrlContentAsDataUrl(url);
}
