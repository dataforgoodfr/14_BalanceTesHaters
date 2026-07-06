import { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";

export async function ogImageUrl(
  scrapingSupport: ScrapingSupport,
): Promise<string | undefined> {
  const url = scrapingSupport.selectMetaPropertyContent("og:image");

  if (!url) return undefined;

  return fetchAsDataUrl(url);
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) return url;
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
